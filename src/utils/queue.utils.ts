import Queue from "bull";

export const apiQueue = new Queue("apiQueue", {
  redis: {
    host: "localhost",
    port: 6379,
  },
});

module.exports = apiQueue;
