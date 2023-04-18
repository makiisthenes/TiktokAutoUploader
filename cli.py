import argparse
from tiktok_uploader import tiktok
from tiktok_uploader.basics import eprint
from tiktok_uploader.Config import Config
import sys

if __name__ == "__main__":
    _ = Config.load("./config.txt")
    print(Config.get().cookies_dir)
    parser = argparse.ArgumentParser(description="TikTokAutoUpload CLI, scheduled and immediate uploads")
    subparsers = parser.add_subparsers(dest="subcommand")
    login_parser = subparsers.add_parser("login", help="Login into TikTok to extract the session id (stored locally)")
    upload_parser = subparsers.add_parser("upload", help="Upload video on TikTok")

    upload_parser.add_argument("-i", "--session_id", help="Tiktok sessionid cookie")
    upload_parser.add_argument("-p", "--path", help="Path to video file", required=True)
    upload_parser.add_argument("-t", "--title", help="Title of the video", required=True)
    upload_parser.add_argument("--tags", nargs='*', default=[], help="List of hashtags for the video")
    upload_parser.add_argument("--users", nargs='*', default=[], help="List of mentioned users for the video")

    args = parser.parse_args()

    if args.subcommand == "login":
        tiktok.login()
    elif args.subcommand == "upload":
        
        session_id = args.session_id if args.session_id else tiktok.get_session_id()
        print(session_id)
        if not session_id:
            eprint("No cookie with Tiktok session id found: use login to save session id")
            sys.exit(1)

        tiktok.upload_video(session_id, args.path, args.title, args.tags, args.users)
    else:
        eprint("Invalid subcommand. Use 'login' or 'upload'.")


