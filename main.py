from Upload import Upload
from User import User
from TaskScheduler import Scheduler


# Class controls the overall running of the system with control of uploading etc.
class Main:
    def __init__(self, video_save_dir):
        self.user = User(video_save_dir)
        self.upload = Upload(self.user)
        self.schedule = Scheduler()
        self.dir = video_save_dir


if __name__ == "__main__":
    # Example Usage
    tiktok_bot = Main("VideosDirPath")  # VideosDirPath, is the directory where images edited will be saved.
    # Use a video from your directory.
    # tiktok_bot.uploadVideo("test1.mp4", "This is test", 1, 2, private=True)

    # Or use youtube url as video source. [Simpsons Meme 1:16 - 1:32 Example]

    # We can add task schedule from read from a csv: url, caption, startTime, endTime, time_to_release.
    tiktok_bot.upload.uploadVideo("https://www.youtube.com/watch?v=-doMNIdooe8", "This is an overflow", 2, 5, private=True, test=False)


