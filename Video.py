# This class deals with the formatting and editing of the video before uploading.
from moviepy.editor import *
import time


class Video:
    def __init__(self, dir, caption, user):
        self.dir = dir
        self.clip = VideoFileClip(self.dir)
        self.font = "Arial"
        self.font_size = 80
        self.caption = caption
        self.tiktok_dim = (1080, 1920)
        self.bg = "black"
        self.color = "white"
        self.userPreference = user
        '''
        if self.start_time is None:
            self.start_time = 0
        else:
            self.start_time = start_time
        if self.end_time is None:
            self.end_time = self.clip.duration
        else:
            self.end_time = end_time
        '''


    def customCrop(self, start_time, end_time):
        templist = sorted([start_time, end_time])
        start_time, end_time = templist[0], templist[1]
        if end_time > self.clip.duration:
            end_time = self.clip.duration
        self.clip = VideoFileClip(self.dir)
        self.dir = os.path.join(self.userPreference.video_save_dir, "processed") + ".mp4"
        self.clip = self.clip.subclip(t_start=start_time, t_end=end_time)
        self.clip.write_videofile(self.dir)


    def createVideo(self):
        self.clip = self.clip.resize(width=1080)  # Ignore error.
        base_clip = ColorClip(size=(1080, 1920), color=[10, 10, 10], duration=self.clip.duration)
        OFFSET = -20
        bottom_meme_pos = 960 + (((1080 / self.clip.size[0]) * (self.clip.size[1])) / 2) + OFFSET
        top_meme_pos = 960 - (((1080 / self.clip.size[0]) * (self.clip.size[1])) / 2) - OFFSET
        to_pos = 1920 / 6
        memeOverlay = TextClip(txt=self.caption, bg_color=self.bg, color=self.color, size=(900, None), kerning=-1,
                               method="caption", font=self.font, fontsize=self.font_size,
                               align="center")  # stroke_color="black", stroke_width=2.5
        memeOverlay = memeOverlay.set_duration(self.clip.duration)
        self.clip = CompositeVideoClip([base_clip, self.clip.set_position(("center", "center")), memeOverlay.set_position(("center", bottom_meme_pos))])
        # Continue normal flow.
        self.dir = os.path.join(self.userPreference.video_save_dir, "post-processed") + ".mp4"
        self.clip.write_videofile(self.dir, fps=24)
        # self.add_ending()  # Has adverse effects, and stops people replaying the video.

    def add_ending(self):
        ending_clip = VideoFileClip("ending.mp4")
        meme_clip = VideoFileClip(self.dir)
        self.clip = concatenate_videoclips([meme_clip.resize(width=1080, height=1920).set_fps(24), ending_clip.resize(width=1080, height=1920).set_fps(24)])

        self.dir = os.path.join(self.userPreference.video_save_dir, "post-processed-with-ending") + ".mp4"
        self.clip.write_videofile(self.dir, fps=24)





if __name__ == "__main__":
    ending_clip = VideoFileClip("ending.mp4")
    txt = TextClip("This text includes an emoji!😂😂", font='Segoe-UI-Emoji', fontsize=44, color="white", bg_color="black")  # This font allows for basic emoji support.
    txt = txt.set_duration(ending_clip.duration)
    clip = CompositeVideoClip([ending_clip, txt.set_position("center", "center")])
    # clip.write_videofile("emoji_overlay.mp4", fps=24)  # Doesnt look good at all.

    '''
    ending_clip = VideoFileClip("ending.mp4")
    meme_clip = VideoFileClip("VideosDirPath/post-processed.mp4")

    clip = concatenate_videoclips(
        [meme_clip.resize(width=1080, height=1920).set_fps(24), ending_clip.resize(width=1080, height=1920).set_fps(24)])
    dir = os.path.join("VideosDirPath", "post-processed-with-ending") + ".mp4"
    clip.write_videofile(dir)
    pass
    # test code
    # video = Video(r"VideosDirPath\test.mp4", "")
    # video.customCrop(0, 2)

    # Testing using ColorClip class in MoviePy. Procedural Method
    # https://zulko.github.io/moviepy/getting_started/videoclips.html
    ending_clip = VideoFileClip("tiktok_end.mp4")
    ending_clip.resize(width=1080, height=1920)

    #base_clip = ColorClip(size=(1080, 1920), color=[10, 10, 10], duration=ending_clip.duration)
    #ending_clip = CompositeVideoClip([base_clip, ending_clip.set_position(("center", "center"))])
    ending_clip.resize(width=1080, height=1920).write_videofile("ending.mp4", fps=24)

    meme_clip = (VideoFileClip("example.mp4").resize(width=1080))  # Ignore error.
    base_clip = ColorClip(size=(1080, 1920), color=[10, 10, 10], duration=meme_clip.duration)
    OFFSET = -20  # 30
    bottom_meme_pos = 960 + (((1080 / meme_clip.size[0]) * (meme_clip.size[1])) / 2) + OFFSET
    top_meme_pos = 960 - (((1080 / meme_clip.size[0]) * (meme_clip.size[1])) / 2) - OFFSET
    to_pos = 1920 / 6
    print(bottom_meme_pos)  # this is position of bottom y of meme on video clip.
    memeText = "This is so funny and so long that it wraps to the other side."
    memeOverlay = TextClip(txt=memeText, bg_color="black", color="white", size=(900, None), kerning=-1,
                           method="caption", font="Arial", fontsize=80,
                           align="center")  # stroke_color="black", stroke_width=2.5
    memeOverlay = memeOverlay.set_duration(meme_clip.duration)
    video = CompositeVideoClip([base_clip, meme_clip.set_position(("center", "center")),
                                memeOverlay.set_position(("center", bottom_meme_pos))])
    video.write_videofile("edited.mp4", fps=24)
    '''
