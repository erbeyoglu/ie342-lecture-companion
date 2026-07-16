/* Classroom mode configuration.
   Set CLASSROOM_DB to your Firebase REALTIME DATABASE root URL.
   IE342 reuses the SAME database as IE301 (rules already open /sessions;
   session codes are random, so concurrent courses never collide).
   Setup notes (kept for reference, ~5 minutes if ever recreated):
     1. console.firebase.google.com → Add project (no Analytics needed).
     2. Build → Realtime Database → Create database → start in locked mode.
     3. Rules tab → paste:
        { "rules": { "sessions": { ".read": true, ".write": true } } }
        (public by design — only ephemeral class scores live here; wipe
        /sessions from the console whenever you like)
     4. Copy the database URL shown on the Data tab into the line below,
        commit and push.
   Leave the empty string to disable classroom mode entirely — every page
   works exactly as before. */
window.CLASSROOM_DB = 'https://ie301-classroom-default-rtdb.europe-west1.firebasedatabase.app';

/* Public base URL used inside student QR links. Keep pointing at the live
   site — this makes QR codes correct even when a page is opened from a
   local file (the instructor deck). */
window.CLASSROOM_PUBLIC_BASE = 'https://erbeyoglu.github.io/ie342-lecture-companion/';
