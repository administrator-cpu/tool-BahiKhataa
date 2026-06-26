import winston from "winston";

const customLevels = {
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
  },
  colors: {
    error: "red",
    warn: "yellow",
    info: "green",
    http: "cyan",
    debug: "white",
  },
};

winston.addColors(customLevels.colors);

const istTimestamp = () => {
  return new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
  .replace(",", "")
  .split("/")
  .reverse()
  .join("-");
};

const logFormat = winston.format.printf(
  ({ timestamp, level, message, stack }) => {
    return `${timestamp} [${level}]: ${stack || message}`;
  }
);

const logger = winston.createLogger({
  levels: customLevels.levels,
  level: process.env.NODE_ENV === "development" ? "debug" : "http",

  format: winston.format.combine(
    winston.format.errors({ stack: true }),
    winston.format.timestamp({
      format: istTimestamp,
    }),
    logFormat
  ),

  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize({ all: true }),
        winston.format.errors({ stack: true }),
        winston.format.timestamp({
          format: istTimestamp,
        }),
        logFormat
      ),
    }),

    new winston.transports.File({
      filename: "logs/error.log",
      level: "error",
    }),

    new winston.transports.File({
      filename: "logs/combined.log",
    }),
  ],
});

export default logger;