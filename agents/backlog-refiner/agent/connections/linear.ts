import { connect } from "@vercel/connect/eve";
import { defineMcpClientConnection } from "eve/connections";

const WRITE_MARKERS = ["create_", "update_", "delete_", "upload_", "add_", "remove_", "move_", "set_", "merge_"];

export default defineMcpClientConnection({
  url: "https://mcp.linear.app/mcp",
  description: "Linear de SplitIt: issues, proyectos, ciclos, equipos y comentarios.",
  auth: connect({ connector: "linear/splitit-c0e8", principalType: "app" }),
  approval: ({ toolName }) =>
    WRITE_MARKERS.some((marker) => toolName.includes(marker)) ? "user-approval" : "not-applicable",
});
