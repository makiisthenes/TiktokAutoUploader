from Upload import Upload
from User import User


# Class controls the overall running of the system with control of uploading etc.
class Main:
    def __init__(self, video_save_dir):
        self.user = User(video_save_dir)
        self.upload = Upload(self.user)

    def uploadVideo(self, file_dir="test1.mp4", video_overlay="", startTime=0, endTime=0, private=True, test=True):
        self.upload.uploadVideo(file_dir, video_overlay)
        
        
if __name__ == "__main__":
    # Example Usage
    tiktok_bot = Main("VideosDirPath")
    # Use a video from your directory.
    tiktok_bot.uploadVideo("test1.mp4", "This is text \n overlay on \n the video", 1, 45)

    # Or use youtube url as video source. [Simpsons Meme 1:16 - 1:32 Example]
    tiktok_bot.uploadVideo("https://www.youtube.com/watch?v=OGEouryaQ3g", "Youtube test", startTime=76, endTime=92, private=False, test=False)

