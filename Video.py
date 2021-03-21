# This class deals with the formatting and editing of the video before uploading.
from moviepy.editor import *
import time


class Video:
    def __init__(self, dir, caption):
        self.dir = dir
        self.clip = VideoFileClip(self.dir)
        self.font = "MS-Reference-Sans-Serif"
        self.font_size = 32
        self.caption = caption
        self.tiktok_dim = (1080, 1920)
        self.bg = "#EB3F41"


    def _captionHeight(self):
        return len(self.caption.splitlines()) * self.font_size + 10


    def _blackScreenImage(self):
        pass


    def _captionWidth(self):
        if not self.caption:
            return .7*self.clip.size[0]
        return 0

    def _captionWrap(self):
        # Used to wrap caption appropriately.
        lines = self.caption.splitlines()
        for line in lines:
            if len(line) > (.7 * self.clip.size[0]):
                # 13 characters allowed per line including spaces.
                pass

    def _calculateCenter(self):
        return int(self.clip.size[0]/2) - int(.35*self.clip.size[0])


    def customCrop(self, start_time, end_time):
        templist = sorted([start_time, end_time])
        start_time, end_time = templist[0], templist[1]
        if end_time > self.clip.duration:
            end_time = self.clip.duration
        self.clip = VideoFileClip(self.dir)
        self.clip = self.clip.subclip(start_time, end_time)
        self.clip.write_videofile(self.dir)


    def stripExif(self):
        # Remove EXIF from videos, don't know how to currently.
        pass


    def _resizeImage(self):
        # Resize frame to be tiktok dimension 1080 x 1920.
        pass


    def _timeDurationCrop(self):
        # Convert Videos to 60 seconds.
        self.clip = VideoFileClip(self.dir)
        if self.clip.duration >60:
            self.clip = self.clip.subclip(0, 60)
            self.clip.write_videofile(self.dir)


    def _videoTextOverlay(self):
        # Adding text to video, dealing with wrap and sizing.
        txt_clip = TextClip(self.caption, fontsize=self.font_size, color='white', bg_color=self.bg, font="MS-Reference-Sans-Serif", size=(self._captionWidth(), self._captionHeight()))
        txt_clip = txt_clip.set_position((self._calculateCenter(), 20)).set_duration(self.clip.duration)
        self.clip = CompositeVideoClip([self.clip, txt_clip])
        self.clip.write_videofile(self.dir)
        print(f"Video created: {time.time()}")


    def createVideo(self):
        self._blackScreenImage()
        self._resizeImage()
        self._timeDurationCrop()
        self._videoTextOverlay()




if __name__ == "__main__":
    # test code
    video = Video(r"VideosDirPath\test.mp4", "")
    video.customCrop(0, 2)