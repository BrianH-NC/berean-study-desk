# Settings workspace

Preferences are stored in the signed-in account's `user_metadata.bsd_preferences` through Supabase Auth. This is preference data only, never an authorization source. Existing records are unchanged. Missing/invalid preferences fall back to validated defaults.

The seven sections cover Account, Bible & Reading, Study Preferences, Library, Connections, Your Data, and About & Help. Save Settings applies staged edits. Reading and library defaults take effect when reopening those pages; explicit Library URL parameters take precedence. The reading goal has its own save button and uses existing `library_goals` records.

Doctrine preferences preselect the separate confessional comparison, retaining the BFM2000 base assessment and existing creation/origins assessment. Sermon audience and detail preferences apply only on the next explicit paid generation. Existing guides are unchanged.

Connections checks request sample chapters on demand and do not claim availability before testing. Provider credentials stay in existing server functions. Eight licensed API.Bible translation options are included alongside local BSB, ESV, and free translations.

Settings exports can be imported, reviewed, and saved. Data exports paginate owned records and include visible and hidden Doctrine Checks through the existing owner-view API. They are archival JSON, not an automatic database restore. Uploaded binaries and cover images are not bundled; preserve originals separately. Failures stop download rather than silently exporting incomplete data.
