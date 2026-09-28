import logging
import os
from logging.handlers import TimedRotatingFileHandler

LOG_DIR = "logs"
os.makedirs(LOG_DIR, exist_ok=True)

logger = logging.getLogger("app_error_logger")
logger.setLevel(logging.ERROR)

# Writes to logs/error.log during the current day. At midnight it's rotated
# to logs/<yesterday's-date>.log and a fresh error.log starts for the new day.
_handler = TimedRotatingFileHandler(
    filename=os.path.join(LOG_DIR, "error.log"),
    when="midnight",
    interval=1,
    backupCount=0,  # 0 = keep every daily file forever. Set a number (e.g. 30) to auto-delete older logs.
    encoding="utf-8",
    utc=False,
)

# Rename rotated files from "error.log.2026-09-02" to "2026-09-02.log"
_handler.suffix = "%Y-%m-%d"
_handler.namer = lambda name: os.path.join(
    LOG_DIR, name.split("todays_error.log.")[-1] + ".log"
)

_formatter = logging.Formatter(
    fmt="[%(asctime)s] %(levelname)s in %(module)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
_handler.setFormatter(_formatter)

if not logger.handlers:
    logger.addHandler(_handler)