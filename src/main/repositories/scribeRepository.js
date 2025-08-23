// /src/main/repositories/scribeRepository.js
module.exports = (db) => ({
    createMeeting: async (title) => {
        const result = await db.run("INSERT INTO meetings (title) VALUES (?)", [title]);
        return result.lastID;
    },
    updateMeetingFullAudio: async (meetingId, speaker, audioBuffer) => {
        const columnName = speaker === 'me' ? 'full_audio_me' : 'full_audio_other';
        return await db.run(`UPDATE meetings SET ${columnName} = ? WHERE id = ?`, [audioBuffer, meetingId]);
    },
    addTranscript: async (meeting_id, speaker, text, audioBuffer) => {
        return await db.run("INSERT INTO transcripts (meeting_id, speaker, text, audio_blob) VALUES (?, ?, ?, ?)", [meeting_id, speaker, text, audioBuffer]);
    },
    addScribeAnalysis: async (meetingId, context, question, answer) => {
        return await db.run("INSERT INTO scribe_analyses (meeting_id, context, question, answer) VALUES (?, ?, ?, ?)", [meetingId, context, question, answer]);
    },
    getScribeAnalysesForMeeting: async (meetingId) => {
        return await db.all("SELECT * FROM scribe_analyses WHERE meeting_id = ? ORDER BY created_at ASC", [meetingId]);
    },
    listMeetings: async () => {
        return await db.all("SELECT id, title, created_at FROM meetings ORDER BY created_at DESC");
    },
    getMeetingById: async (id) => {
        return await db.get("SELECT id, title, created_at, full_audio_me, full_audio_other FROM meetings WHERE id = ?", [id]);
    },
    getTranscriptsForMeeting: async (meeting_id) => {
        return await db.all("SELECT speaker, text, timestamp, audio_blob FROM transcripts WHERE meeting_id = ? ORDER BY timestamp ASC", [meeting_id]);
    },
    deleteMeetingById: async (id) => {
        const result = await db.run("DELETE FROM meetings WHERE id = ?", [id]);
        return result.changes;
    },
    clearAll: async () => {
        return await db.run("DELETE FROM meetings");
    }
});