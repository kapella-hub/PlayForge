import QRCode from "qrcode";

export async function generateInviteQR(
  inviteCode: string,
  baseUrl: string,
): Promise<string> {
  const joinUrl = `${baseUrl}/join?code=${inviteCode}`;
  return QRCode.toDataURL(joinUrl, {
    width: 256,
    margin: 2,
    color: {
      dark: "#10201d",
      light: "#ffffff",
    },
  });
}
