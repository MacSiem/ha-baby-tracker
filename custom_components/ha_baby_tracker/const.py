"""Constants for HA Baby Tracker."""

from __future__ import annotations

DOMAIN = "ha_baby_tracker"
NAME = "Baby Tracker"
VERSION = "5.0.15"

MANUFACTURER = "HA Tools"
MODEL = "Baby Tracker"

DATA_FRONTEND_REGISTERED = "frontend_registered"
DATA_SERVICES_REGISTERED = "services_registered"
DATA_STORES = "stores"
DATA_WS_REGISTERED = "ws_registered"

EVENT_ENTRY_ADDED = f"{DOMAIN}_entry_added"

SERVICE_LOG_FEEDING = "log_feeding"
SERVICE_LOG_DIAPER = "log_diaper"
SERVICE_LOG_SLEEP = "log_sleep"

STORAGE_VERSION = 1


def signal_child_updated(entry_id: str) -> str:
    """Return the dispatcher signal for one child entry."""
    return f"{DOMAIN}_{entry_id}_updated"
