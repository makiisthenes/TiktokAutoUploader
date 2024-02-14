import argparse
from tiktok_uploader import tiktok, Video
from tiktok_uploader.basics import eprint
from tiktok_uploader.Config import Config
import sys, os

if __name__ == "__main__":
    _ = Config.load("./config.txt")
    # print(Config.get().cookies_dir)
    parser = argparse.ArgumentParser(description="TikTokAutoUpload CLI, scheduled and immediate uploads")
    subparsers = parser.add_subparsers(dest="subcommand")

    # Login subcommand.
    login_parser = subparsers.add_parser("login", help="Login into TikTok to extract the session id (stored locally)")
    login_parser.add_argument("-n", "--name", help="Name to save cookie as", required=True)

    # Upload subcommand.
    upload_parser = subparsers.add_parser("upload", help="Upload video on TikTok")
    upload_parser.add_argument("-u", "--users", help="Enter cookie name from login", required=True)
    upload_parser.add_argument("-v", "--video", help="Path to video file")
    upload_parser.add_argument("-yt", "--youtube", help="Enter Youtube URL")
    upload_parser.add_argument("-t", "--title", help="Title of the video", required=True)
    upload_parser.add_argument("-sc", "--schedule", type=int, default=0, help="Schedule time in seconds")
    upload_parser.add_argument("-ct", "--comment", type=int, default=1, choices=[0, 1])
    upload_parser.add_argument("-d", "--duet", type=int, default=0, choices=[0, 1])
    upload_parser.add_argument("-st", "--stitch", type=int, default=0, choices=[0, 1])
    upload_parser.add_argument("-vi", "--visibility", type=int, default=0, help="Visibility type: 0 for public, 1 for private")
    upload_parser.add_argument("-bo", "--brandorganic", type=int, default=0)
    upload_parser.add_argument("-bc", "--brandcontent", type=int, default=0)
    upload_parser.add_argument("-ai", "--ailabel", type=int, default=0)
    upload_parser.add_argument("-p", "--proxy", default="")

    # Show cookies
    show_parser = subparsers.add_parser("show", help="Show users and videos available for system.")
    show_parser.add_argument("-u", "--users", action='store_true', help="Shows all available cookie names")
    show_parser.add_argument("-v", "--videos",  action='store_true', help="Shows all available videos")

    # Parse the command-line arguments
    args = parser.parse_args()

    if args.subcommand == "login":
        if not hasattr(args, 'name') or args.name is None:
            parser.error("The 'name' argument is required for the 'login' subcommand.")
        # Name of file to save the session id.
        login_name = args.name
        # Name of file to save the session id.
        tiktok.login(login_name)

    elif args.subcommand == "upload":
        # Obtain session id from the cookie name.
        if not hasattr(args, 'users') or args.users is None:
            parser.error("The 'cookie' argument is required for the 'upload' subcommand.")
        session_id = tiktok.get_session_id(args.users)
        # session_id = upload_args.session_id if upload_args.session_id else tiktok.get_session_id()
        # print(session_id)
        if not session_id:
            eprint("No cookie with Tiktok session id found: use login to save session id")
            sys.exit(1)

        # Check if source exists,
        if args.video is None and args.youtube is None:
            eprint("No source provided. Use -v or -yt to provide video source.")
            sys.exit(1)
        if args.video and args.youtube:
            eprint("Both -v and -yt flags cannot be used together.")
            sys.exit(1)

        if args.youtube:
            video_obj = Video(args.youtube, args.title)
            video_obj.is_valid_file_format()
            video = video_obj.source_ref
            args.video = video
        else:
            if not os.path.exists(os.path.join(os.getcwd(), Config.get().videos_dir, args.video)) and args.video:
                print("[-] Video does not exist")
                print("Video Names Available: ")
                video_dir = os.path.join(os.getcwd(), Config.get().videos_dir)
                for name in os.listdir(video_dir):
                    print(f'[-] {name}')
                sys.exit(1)

        tiktok.upload_video(session_id, args.video,  args.title, args.schedule, args.comment, args.duet, args.stitch, args.visibility, args.brandorganic, args.brandcontent, args.ailabel, args.proxy)

    elif args.subcommand == "show":
        # if flag is c then show cookie names
        if args.users:
            print("User Names logged in: ")
            cookie_dir = os.path.join(os.getcwd(), Config.get().cookies_dir)
            for name in os.listdir(cookie_dir):
                if name.startswith("tiktok_session-"):
                    print(f'[-] {name.split("tiktok_session-")[1]}')

        # if flag is v then show video names
        if args.videos:
            print("Video Names: ")
            video_dir = os.path.join(os.getcwd(), Config.get().videos_dir)
            for name in os.listdir(video_dir):
                print(f'[-] {name}')
        elif not args.users and not args.videos:
            print("No flag provided. Use -c (show all cookies) or -v (show all videos).")

    else:
        eprint("Invalid subcommand. Use 'login' or 'upload' or 'show'.")


