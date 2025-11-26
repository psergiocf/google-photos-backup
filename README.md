This is just a small and very raw script to extract photos and videos from a Google Takeout zip file (PT only) containing Google Photos data.

To use this script, run the command:

```bash
node google-photos-backup.mjs <source_path> <destination_path>
```

- `source_path`: is where the zip files should be after being downloaded from Google Takeout containing your Google Photos data. Each zip file should contain the structure `Takeout/Google Fotos`. The `example` folder in this repository contains a sample structure.
- `destination_path`: is where you want the extracted photos and videos to be saved.
