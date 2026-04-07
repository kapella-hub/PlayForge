import type {
  AnimationData,
  AnimationKeyframe,
  BallFlight,
  CanvasData,
  CanvasPlayer,
  Route,
} from "./types";

export interface AnimationState {
  time: number;
  duration: number;
  isPlaying: boolean;
  speed: number;
  playerPositions: Map<string, { x: number; y: number }>;
  ballPosition: { x: number; y: number; visible: boolean } | null;
  activeRead: number | null;
}

/** Labels that indicate a QB */
const QB_LABELS = new Set(["QB"]);

/** Labels that indicate a receiver eligible for reads */
const RECEIVER_LABELS = new Set(["X", "Z", "H", "Y", "A", "TE"]);

/**
 * Calculate cumulative distances along a set of waypoints.
 * Returns an array of distances from the start, one per waypoint.
 */
function cumulativeDistances(waypoints: { x: number; y: number }[]): number[] {
  const distances = [0];
  for (let i = 1; i < waypoints.length; i++) {
    const dx = waypoints[i].x - waypoints[i - 1].x;
    const dy = waypoints[i].y - waypoints[i - 1].y;
    distances.push(distances[i - 1] + Math.sqrt(dx * dx + dy * dy));
  }
  return distances;
}

/**
 * Generate keyframes automatically from routes.
 * Players with routes get keyframes interpolated along their waypoints.
 * Players without routes stay at their starting position.
 */
export function generateKeyframes(canvasData: CanvasData): AnimationData {
  const duration = 3; // seconds
  const keyframesPerRoute = 30; // smooth interpolation
  const keyframes: AnimationKeyframe[] = [];

  for (const player of canvasData.players) {
    const route = canvasData.routes.find((r) => r.playerId === player.id);

    if (!route || route.waypoints.length < 2) {
      // Stationary player: single keyframe at start
      keyframes.push({
        playerId: player.id,
        time: 0,
        x: player.x,
        y: player.y,
      });
      keyframes.push({
        playerId: player.id,
        time: 1,
        x: player.x,
        y: player.y,
      });
      continue;
    }

    const wps = route.waypoints;
    const distances = cumulativeDistances(wps);
    const totalDist = distances[distances.length - 1];

    if (totalDist === 0) {
      keyframes.push({
        playerId: player.id,
        time: 0,
        x: wps[0].x,
        y: wps[0].y,
      });
      keyframes.push({
        playerId: player.id,
        time: 1,
        x: wps[0].x,
        y: wps[0].y,
      });
      continue;
    }

    for (let i = 0; i <= keyframesPerRoute; i++) {
      const t = i / keyframesPerRoute; // normalized time 0..1
      const targetDist = t * totalDist;

      // Find the segment this distance falls on
      let segIdx = 0;
      for (let j = 1; j < distances.length; j++) {
        if (distances[j] >= targetDist) {
          segIdx = j - 1;
          break;
        }
        segIdx = j - 1;
      }

      const segStart = distances[segIdx];
      const segEnd = distances[segIdx + 1] ?? segStart;
      const segLen = segEnd - segStart;
      const localT = segLen > 0 ? (targetDist - segStart) / segLen : 0;

      const x =
        wps[segIdx].x + (wps[Math.min(segIdx + 1, wps.length - 1)].x - wps[segIdx].x) * localT;
      const y =
        wps[segIdx].y + (wps[Math.min(segIdx + 1, wps.length - 1)].y - wps[segIdx].y) * localT;

      keyframes.push({ playerId: player.id, time: t, x, y });
    }
  }

  // Ball flight: if play is a pass, animate from QB to first receiver with a route
  let ballFlight: BallFlight | undefined;
  if (canvasData.meta.playType === "pass") {
    const qb = canvasData.players.find((p) => QB_LABELS.has(p.label));
    const receiversWithRoutes = canvasData.players.filter(
      (p) =>
        RECEIVER_LABELS.has(p.label) &&
        canvasData.routes.some(
          (r) => r.playerId === p.id && r.waypoints.length >= 2,
        ),
    );
    if (qb && receiversWithRoutes.length > 0) {
      // First read target is the first receiver
      ballFlight = {
        fromPlayerId: qb.id,
        toPlayerId: receiversWithRoutes[0].id,
        time: 0.6, // ball thrown at 60% through the play
      };
    }
  }

  return { keyframes, duration, ballFlight };
}

/**
 * Interpolate a player's position at a given normalized time (0..1).
 * Keyframes should be sorted by time for this player.
 */
export function getPositionAtTime(
  keyframes: AnimationKeyframe[],
  time: number,
  _duration: number,
): { x: number; y: number } {
  if (keyframes.length === 0) return { x: 0, y: 0 };
  if (keyframes.length === 1) return { x: keyframes[0].x, y: keyframes[0].y };

  // Clamp time
  const t = Math.max(0, Math.min(1, time));

  // Find surrounding keyframes
  if (t <= keyframes[0].time) {
    return { x: keyframes[0].x, y: keyframes[0].y };
  }
  if (t >= keyframes[keyframes.length - 1].time) {
    const last = keyframes[keyframes.length - 1];
    return { x: last.x, y: last.y };
  }

  for (let i = 0; i < keyframes.length - 1; i++) {
    if (t >= keyframes[i].time && t <= keyframes[i + 1].time) {
      const segLen = keyframes[i + 1].time - keyframes[i].time;
      const localT = segLen > 0 ? (t - keyframes[i].time) / segLen : 0;
      return {
        x: keyframes[i].x + (keyframes[i + 1].x - keyframes[i].x) * localT,
        y: keyframes[i].y + (keyframes[i + 1].y - keyframes[i].y) * localT,
      };
    }
  }

  const last = keyframes[keyframes.length - 1];
  return { x: last.x, y: last.y };
}

/**
 * Get all player positions and ball state at a given time in seconds.
 */
export function getAnimationFrame(
  animationData: AnimationData,
  canvasData: CanvasData,
  time: number,
): AnimationState {
  const normalizedTime = Math.max(
    0,
    Math.min(1, time / animationData.duration),
  );

  // Group keyframes by player
  const keyframesByPlayer = new Map<string, AnimationKeyframe[]>();
  for (const kf of animationData.keyframes) {
    const list = keyframesByPlayer.get(kf.playerId) ?? [];
    list.push(kf);
    keyframesByPlayer.set(kf.playerId, list);
  }

  // Calculate position for each player
  const playerPositions = new Map<string, { x: number; y: number }>();
  for (const player of canvasData.players) {
    const kfs = keyframesByPlayer.get(player.id);
    if (kfs && kfs.length > 0) {
      playerPositions.set(
        player.id,
        getPositionAtTime(kfs, normalizedTime, animationData.duration),
      );
    } else {
      playerPositions.set(player.id, { x: player.x, y: player.y });
    }
  }

  // Ball position
  let ballPosition: { x: number; y: number; visible: boolean } | null = null;
  if (animationData.ballFlight) {
    const bf = animationData.ballFlight;
    const throwTime = bf.time;
    const catchTime = Math.min(throwTime + 0.25, 1); // ball takes ~25% of duration to arrive

    if (normalizedTime >= throwTime && normalizedTime <= catchTime) {
      // Ball is in flight
      const flightProgress = (normalizedTime - throwTime) / (catchTime - throwTime);
      const fromPos = playerPositions.get(bf.fromPlayerId);
      const toPos = playerPositions.get(bf.toPlayerId);

      if (fromPos && toPos) {
        // Linear x/y with parabolic arc (ball goes "up" in z, shown as y offset)
        const arcHeight = -40 * flightProgress * (1 - flightProgress); // parabola
        ballPosition = {
          x: fromPos.x + (toPos.x - fromPos.x) * flightProgress,
          y:
            fromPos.y +
            (toPos.y - fromPos.y) * flightProgress +
            arcHeight,
          visible: true,
        };
      }
    } else if (normalizedTime > catchTime) {
      // Ball at receiver
      const toPos = playerPositions.get(bf.toPlayerId);
      if (toPos) {
        ballPosition = { x: toPos.x, y: toPos.y, visible: true };
      }
    }
  }

  // QB read progression
  let activeRead: number | null = null;
  if (canvasData.meta.playType === "pass") {
    const receiversWithRoutes = canvasData.players.filter(
      (p) =>
        RECEIVER_LABELS.has(p.label) &&
        canvasData.routes.some(
          (r) => r.playerId === p.id && r.waypoints.length >= 2,
        ),
    );
    if (receiversWithRoutes.length > 0) {
      // Each read takes equal time during the first 70% of the play
      const readWindow = 0.7;
      const readDuration = readWindow / receiversWithRoutes.length;
      const readIndex = Math.min(
        Math.floor(normalizedTime / readDuration),
        receiversWithRoutes.length - 1,
      );
      activeRead = normalizedTime <= readWindow ? readIndex + 1 : receiversWithRoutes.length;
    }
  }

  return {
    time,
    duration: animationData.duration,
    isPlaying: false, // caller manages this
    speed: 1,
    playerPositions,
    ballPosition,
    activeRead,
  };
}

/**
 * Get the ordered list of receiver IDs for QB read progression.
 */
export function getReadOrder(canvasData: CanvasData): string[] {
  return canvasData.players
    .filter(
      (p) =>
        RECEIVER_LABELS.has(p.label) &&
        canvasData.routes.some(
          (r) => r.playerId === p.id && r.waypoints.length >= 2,
        ),
    )
    .map((p) => p.id);
}
