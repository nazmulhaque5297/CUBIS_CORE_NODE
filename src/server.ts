import appFactory from "./app";
import { getPort, minioBucketName, objectStorage } from "./configs/app.config";
import { createBucket } from "./db/minio.db";
import { listOBSBuckets } from "./db/obs.db";

(async function () {
  // if (objectStorage == "minio") {
  //   await createBucket(minioBucketName);
  // }
  // if (objectStorage == "obs") {
  //   await listOBSBuckets();
  // }

  const PORT = getPort();
  const app = await appFactory();


  app.listen(PORT, () => console.log(`[INFO] Listening on port ${PORT}`));
})();
