import { serve } from "https://deno.land/std@0.126.0/http/server.ts";
import { Notification } from "https://deno.land/x/deno_notify@1.1.3/ts/mod.ts";
import * as log from "https://deno.land/std@0.126.0/log/mod.ts";

const port = 8080;
const reminderQueue: Reminder[] = [];
const timePattern = /((?<hours>[1-9][0-9]?)h)?((?<minutes>[1-9][0-9]?)m)?((?<seconds>[1-9][0-9]?)s)?/;

interface Reminder {
    scheduleTime: ScheduleTime;
    reminderDate: Date;
    requestDate: Date;
    message: string;
}

interface ScheduleTime {
    hours?: number;
    minutes?: number;
    seconds?: number;
}

const parseReminder = (time: string, message: string): Reminder => {
    const timeMatch = time.match(timePattern)?.groups;
    if (!timeMatch) {
        log.error("Invalid schedule time");
        Deno.exit(1);
    }

    const scheduleTime: ScheduleTime = { hours: +timeMatch.hours, minutes: +timeMatch?.minutes, seconds: +timeMatch?.seconds }

    const requestDate : Date = new Date();
    const reminderDate: Date = new Date(requestDate.getTime());

    reminderDate.setHours  (reminderDate.getHours()   + (scheduleTime.hours   || 0));
    reminderDate.setMinutes(reminderDate.getMinutes() + (scheduleTime.minutes || 0));
    reminderDate.setSeconds(reminderDate.getSeconds() + (scheduleTime.seconds || 0));

    return { scheduleTime, reminderDate, requestDate, message };
}

const scheduleReminder = (_socket: WebSocket, data: string) => {
    const { time: scheduleTime, message } = JSON.parse(data);
    const receivedReminder: Reminder = parseReminder(scheduleTime, message);

    log.debug(`Received ${JSON.stringify(receivedReminder)}`);
    reminderQueue.push(receivedReminder);
}

const processReminders = () => {
    const now = new Date();
    reminderQueue.forEach((reminder: Reminder, index: number) => {
        if (now.getTime() >= reminder.reminderDate.getTime()) {
            log.debug(`Sending notification for reminder ${reminder}`);
            new Notification()
                .title("Reminder")
                .body(reminder.message)
                .show();
            reminderQueue.splice(index, 1);
        }
    });
}

const handleConnected = () => log.info("Reminder request received");
const handleError = (e: Event | ErrorEvent) => {
    log.error(e instanceof ErrorEvent ? e.message : e.type);
}

const handler = (request: Request): Response => {
    const { socket: ws, response } = Deno.upgradeWebSocket(request);
    ws.onopen    = ( ) => handleConnected();
    ws.onmessage = (m) => scheduleReminder(ws, m.data);
    ws.onerror   = (e) => handleError(e);
    ws.onclose   = ( ) => log.debug("Closing socket connection");
    return response;
};

setInterval(processReminders, 1000);

log.info(`Listening for reminders`);
await serve(handler, { port });