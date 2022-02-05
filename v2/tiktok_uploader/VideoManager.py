from .Video import Video


class VideoManager:
    def __init__(self):
        self.videos = []

    def createVideo(self, dir:str, videoText:str =None):
        """
        Creates a video from the given directory with a specific video text.
        """
        v1 = Video(dir, videoText)
        dir, videofileclip = v1.createVideo()

        print(dir)
        return dir
