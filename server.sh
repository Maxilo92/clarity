#!/bin/bash

# --- Clarity Server Manager ---

PID_FILE=".server.pid"
LOG_FILE="server.log"
SERVER_JS="server.js"

start() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p "$PID" > /dev/null; then
            echo "Server is already running (PID: $PID)."
            return
        fi
        rm "$PID_FILE"
    fi

    echo "Starting Clarity Server..."
    nohup node "$SERVER_JS" > "$LOG_FILE" 2>&1 &
    echo $! > "$PID_FILE"
    echo "Server started (PID: $(cat "$PID_FILE")). Logs: $LOG_FILE"
}

stop() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        echo "Stopping Clarity Server (PID: $PID)..."
        kill "$PID" 2>/dev/null
        
        # Wait a moment and force kill if still running
        sleep 2
        if ps -p "$PID" > /dev/null; then
            echo "Force killing..."
            kill -9 "$PID" 2>/dev/null
        fi
        
        rm "$PID_FILE"
        echo "Server stopped."
    else
        # Fallback: find by process name if PID file is missing
        PID=$(pgrep -f "node $SERVER_JS")
        if [ ! -z "$PID" ]; then
            echo "Stopping server via process name..."
            kill $PID
            echo "Server stopped."
        else
            echo "Server is not running."
        fi
    fi
}

status() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p "$PID" > /dev/null; then
            echo "Server is running (PID: $PID)."
            tail -n 5 "$LOG_FILE"
        else
            echo "Server is NOT running (Stale PID file found)."
        fi
    else
        echo "Server is NOT running."
    fi
}

case "$1" in
    start)
        start
        ;;
    stop)
        stop
        ;;
    restart)
        stop
        sleep 1
        start
        ;;
    status)
        status
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status}"
        exit 1
esac
