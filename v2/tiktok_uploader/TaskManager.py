from tiktok_uploader.Browser import Browser
from tiktok_uploader.VideoManager import VideoManager
from tiktok_uploader.Uploader import Uploader



class TaskManager:
    def __init__(self, tiktok_bot):
        self.tiktok_bot = tiktok_bot
        self.video_manager = VideoManager()
        self.tasks = []
        self.browser = Browser.getBrowser()

    def uploadVideo(self, video_path:str, videoText):
        dir = self._createVideo(video_path, videoText)
        task = Uploader(dir)
        task.uploadVideo()

    def scheduleVideo(self, video_path:str, schedule_time:str):
        """Not implemented yet"""
        pass

    def _createVideo(self, video_path:str, videoText):
        return self.video_manager.createVideo(video_path, videoText)
