import { createSystemConfig } from "./config";
import { System } from "./services/system";
import "dotenv/config";

const main = () => {
  const config = createSystemConfig(process.env);
  const system = new System(config);

  ["SIGINT", "SIGTERM", "SIGHUP"].forEach((code) => {
    process.on(code, () => {
      system.stop();
    });
  });

  system.start();
};

main();
