import type { NextConfig } from "next";
import { withEve } from "eve/next";

const nextConfig: NextConfig = {};

export default withEve(nextConfig, {
  agents: {
    "control-tower": "./agents/control-tower/agent",
    "backlog-refiner": "./agents/backlog-refiner/agent",
    "meeting-steering": "./agents/meeting-steering/agent",
  },
});
