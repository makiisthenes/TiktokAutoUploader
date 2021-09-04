# This class deals with the formatting and editing of the video before uploading.
from moviepy.editor import *
from pytube import YouTube
from moviepy.editor import VideoFileClip, AudioFileClip
import time
from tqdm import tqdm



class Video:
    def __init__(self, dir, caption, user):
        self.dir = dir
        try:
            self.clip = VideoFileClip(self.dir)
        except Exception as e:
            print(f"Could not convert {self.dir} into a video file")
            print(f"Error: {e}")
            self.clip = None
        self.font = "Arial"
        self.font_size = 80
        self.caption = caption
        self.tiktok_dim = (1080, 1920)
        self.bg = "black"
        self.color = "white"
        self.userPreference = user


    def customCrop(self, start_time, end_time):
        templist = sorted([start_time, end_time])
        start_time, end_time = templist[0], templist[1]
        if end_time > self.clip.duration:
            end_time = self.clip.duration
        self.clip = VideoFileClip(self.dir)
        self.dir = os.path.join(self.userPreference.video_save_dir, "processed") + ".mp4"
        self.clip = self.clip.subclip(t_start=start_time, t_end=end_time)
        self.clip.write_videofile(self.dir)


    def createVideo(self, direct=False):
        self.clip = self.clip.resize(width=1080)  # Ignore error.
        base_clip = ColorClip(size=(1080, 1920), color=[10, 10, 10], duration=self.clip.duration)
        OFFSET = -20
        bottom_meme_pos = 960 + (((1080 / self.clip.size[0]) * (self.clip.size[1])) / 2) + OFFSET
        # top_meme_pos = 960 - (((1080 / self.clip.size[0]) * (self.clip.size[1])) / 2) - OFFSET
        # to_pos = 1920 / 6
        if self.caption != "":
            try:
                memeOverlay = TextClip(txt=self.caption, bg_color=self.bg, color=self.color, size=(900, None), kerning=-1,
                                   method="caption", font=self.font, fontsize=self.font_size,
                                   align="center")  # stroke_color="black", stroke_width=2.5
            except OSError:
                print("Please make sure that you have ImageMagick is not installed on your computer, or (for Windows users) that you didn't specify the path to the ImageMagick binary in file conf.py, or that the path you specified is incorrect")
                memeOverlay = None
                exit()
            memeOverlay = memeOverlay.set_duration(self.clip.duration)
            self.clip = CompositeVideoClip([base_clip, self.clip.set_position(("center", "center")), memeOverlay.set_position(("center", bottom_meme_pos))])
        # Continue normal flow.
        self.dir = os.path.join(self.userPreference.video_save_dir, "post-processed") + ".mp4"
        self.clip.write_videofile(self.dir, fps=24)


    @staticmethod
    def get_youtube_video(user, url, max_res=1080):

        streams = YouTube(url).streams.filter(progressive=True)
        valid_streams = sorted(streams, reverse=True, key=lambda x: x.resolution is not None)
        filtered_streams = sorted(valid_streams, reverse=True, key=lambda x: int(x.resolution.split("p")[0]))
        if filtered_streams:
            selected_stream = filtered_streams[0]
            print("Starting Download for Video...")
            selected_stream.download(output_path="VideosDirPath", filename="pre-processed")
            filename = os.path.join("VideosDirPath", "pre-processed"+".mp4")
            return filename


        video = YouTube(url).streams.filter(file_extension="mp4", adaptive=True).first()
        audio = YouTube(url).streams.filter(file_extension="webm", only_audio=True, adaptive=True).first()
        if video and audio:
            random_filename = str(int(time.time()))  # extension is added automatically.
            video_path = os.path.join(user.video_save_dir, "pre-processed.mp4")
            resolution = int(video.resolution[:-1])
            # print(resolution)
            if resolution >= 360:
                downloaded_v_path = video.download(output_path="VideosDirPath", filename=random_filename)
                print("Downloaded Video File @ " + video.resolution)
                downloaded_a_path = audio.download(output_path="VideosDirPath", filename="a" + random_filename)
                print("Downloaded Audio File")
                file_check_iter = 0
                while not os.path.exists(downloaded_a_path) and os.path.exists(downloaded_v_path):
                    time.sleep(2**file_check_iter)
                    file_check_iter = +1
                    if file_check_iter > 3:
                        print("Error saving these files to directory, please try again")
                        return
                    print("Waiting for files to appear.")

                composite_video = VideoFileClip(downloaded_v_path).set_audio(AudioFileClip(downloaded_a_path))
                composite_video.write_videofile(video_path)
                # Deleting raw video and audio files.
                os.remove(downloaded_a_path)
                os.remove(downloaded_v_path)
                return video_path
            else:
                print("All videos have are too low of quality.")
                return
        print("No videos available with both audio and video available...")
        return False
