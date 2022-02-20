import { parse } from "https://deno.land/std@0.126.0/flags/mod.ts";
import * as log from "https://deno.land/std@0.126.0/log/mod.ts";

const port = 8080;
const socketHost = `ws://localhost:${port}`;

interface ReminderRequest {
    time: string;
    message: string;
}

const handleError = (e: Event | ErrorEvent) => {
    log.error(e instanceof ErrorEvent ? e.message : e.type);
}

const requestReminder = (reminderSocket: WebSocket, reminder: ReminderRequest) => {
    log.debug(`Scheduling reminder with reminder socket on host: ${socketHost}`);
    reminderSocket.send(JSON.stringify(reminder));
    reminderSocket.close();
}

const parseReminderFromArgs = (args: string[]): ReminderRequest => {
    const { t: time, m: message } = parse(args);
    return { time, message};
}

const initialiseReminderSocket = (reminder: ReminderRequest) => {
    const reminderSocket = new WebSocket(socketHost);
    reminderSocket.onopen  = ( ) => requestReminder(reminderSocket, reminder);
    reminderSocket.onclose = ( ) => log.debug("Reminder request sent, exiting...");
    reminderSocket.onerror = (e) => handleError(e);
}

const reminderRequest: ReminderRequest = parseReminderFromArgs(Deno.args);
initialiseReminderSocket(reminderRequest);