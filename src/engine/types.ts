export interface CanvasPlayer {
  id: string;
  label: string;
  x: number;
  y: number;
  side: "offense" | "defense";
}

export interface RouteWaypoint {
  x: number;
  y: number;
}

export interface Route {
  playerId: string;
  waypoints: RouteWaypoint[];
  type: "solid" | "dashed" | "thick";
  routeType?: string;
}

export interface CanvasData {
  players: CanvasPlayer[];
  routes: Route[];
  meta: {
    formation: string;
    playType: string;
    side: "offense" | "defense";
  };
}

export interface AnimationKeyframe {
  playerId: string;
  time: number;
  x: number;
  y: number;
}

export interface BallFlight {
  fromPlayerId: string;
  toPlayerId: string;
  time: number;
}

export interface AnimationData {
  keyframes: AnimationKeyframe[];
  duration: number;
  ballFlight?: BallFlight;
}

export interface FormationTemplate {
  id: string;
  name: string;
  side: "offense" | "defense";
  players: CanvasPlayer[];
}
