# RSVP backend setup (Google Sheet + Apps Script)

Do this signed in as the Google account that should own the data (pandrewwedding27@gmail.com).

1. **Create the sheet.** Go to sheets.new and name it "Wedding RSVPs".
2. **Open the script editor.** In the sheet: Extensions > Apps Script. Delete the sample code and paste in
   everything from `Code.gs` (this folder). Save (Ctrl+S).
3. **Add the site password.** Project Settings (gear icon) > Script properties > Add script property:
   - Property: `SITE_PASSWORD`
   - Value: the same password guests type on the site's password screen.
4. **Run setup once.** Choose the `setup` function in the toolbar and press Run. Google asks for permission
   (Sheets and sending email). On "Google hasn't verified this app", choose Advanced > Go to project (unsafe);
   it is your own script. This creates the `RSVPs` and `Guests` tabs.
5. **Deploy.** Deploy > New deployment > gear icon > Web app.
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Press Deploy and copy the **Web app URL** (ends in `/exec`).
6. **Connect the site.** Paste the URL into `RSVP_ENDPOINT` at the top of `js/rsvp.js`.
7. **Test.** Submit a test RSVP on the site, check the sheet and your inbox, try "Update my RSVP", then delete the
   test rows from both tabs.

Notes
- Changing `Code.gs` later needs Deploy > Manage deployments > edit > Version: New version > Deploy.
- If the site password changes, update the `SITE_PASSWORD` script property and the GitHub secret of the same name.
- Email alerts go to `OWNER_EMAIL` at the top of `Code.gs`. Gmail allows about 100 script emails a day.
- Keep the sheet private. The web app URL only accepts requests that include the site password.
