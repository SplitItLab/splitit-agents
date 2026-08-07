import { eveChannel } from "eve/channels/eve";
import { localDev, type AuthFn } from "eve/channels/auth";

// ponytail: single-user v1. Add real auth before sharing the URL broadly.
const pmPrincipal: AuthFn<Request> = async () => ({
  authenticator: "app",
  principalId: "splitit-pm",
  principalType: "user",
  attributes: { role: "pm", project: "splitit" },
});

export default eveChannel({ auth: [pmPrincipal, localDev()] });
