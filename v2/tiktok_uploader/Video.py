from .IO import IO
from moviepy.editor import *
from moviepy.editor import VideoFileClip, AudioFileClip
from pytube import YouTube
import sys
import time, os




class Video:

    def __init__(self, source_ref, videoText):
        self.source_ref = source_ref
        self.videoText = videoText
        self.io = IO.getInstance()
        self.font = self.io.getDefaultFont()
        self.font_size = self.io.getDefaultFontSize()
        self.tt_dim = self.io.getTiktokDimension()
        self.background_color = self.io.getDefaultTextBackgroundColor()
        self.foreground_color = self.io.getDefaultTextForegroundColor()
        self.video_save_dir = self.io.getVideoSaveDir()


        self.source_ref = self.downloadIfYoutubeURL()
        # Wait until self.source_ref is found in the file system.
        while not os.path.isfile(self.source_ref):
            time.sleep(1)

        self.clip = VideoFileClip(self.source_ref)


    def customCrop(self, start_time, end_time, saveFile=False):
        if end_time > self.clip.duration:
            end_time = self.clip.duration
        save_path = os.path.join(self.video_save_dir, "processed") + ".mp4"
        self.clip = self.clip.subclip(t_start=start_time, t_end=end_time)
        if saveFile:
            self.clip.write_videofile(save_path)
        return self.clip


    def createVideo(self):
        self.clip = self.clip.resize(width=1080)
        base_clip = ColorClip(size=(1080, 1920), color=[10, 10, 10], duration=self.clip.duration)
        bottom_meme_pos = 960 + (((1080 / self.clip.size[0]) * (self.clip.size[1])) / 2) + -20
        if self.videoText:
            try:
                memeOverlay = TextClip(txt=self.videoText, bg_color=self.background_color, color=self.foreground_color, size=(900, None), kerning=-1,
                            method="caption", font=self.font, fontsize=self.font_size, align="center")
            except OSError as e:
                print("Please make sure that you have ImageMagick is not installed on your computer, or (for Windows users) that you didn't specify the path to the ImageMagick binary in file conf.py, or that the path you specified is incorrect")
                print("https://imagemagick.org/script/download.php#windows")
                print(e)
                sys.exit()
            memeOverlay = memeOverlay.set_duration(self.clip.duration)
            self.clip = CompositeVideoClip([base_clip, self.clip.set_position(("center", "center")),
                                            memeOverlay.set_position(("center", bottom_meme_pos))])
            # Continue normal flow.

        dir = os.path.join(self.io.getVideoSaveDir(), "post-processed")+".mp4"
        self.clip.write_videofile(dir, fps=24)
        return dir, self.clip


    def checkFileExtensionValid(self):
        if not self.source_ref.endswith('.mp4'):
            sys.exit(f"File: {self.source_ref} has wrong file extension. Must be .mp4")


    def get_youtube_video(self, max_res=True):
        url = self.source_ref
        streams = YouTube(url).streams.filter(progressive=True)
        valid_streams = sorted(streams, reverse=True, key=lambda x: x.resolution is not None)
        filtered_streams = sorted(valid_streams, reverse=True, key=lambda x: int(x.resolution.split("p")[0]))
        if filtered_streams:
            selected_stream = filtered_streams[0]
            print("Starting Download for Video...")
            selected_stream.download(output_path="VideosDirPath", filename="pre-processed.mp4")
            filename = os.path.join("VideosDirPath", "pre-processed"+".mp4")
            return filename


        video = YouTube(url).streams.filter(file_extension="mp4", adaptive=True).first()
        audio = YouTube(url).streams.filter(file_extension="webm", only_audio=True, adaptive=True).first()
        if video and audio:
            random_filename = str(int(time.time()))  # extension is added automatically.
            video_path = os.path.join(self.video_save_dir, "pre-processed.mp4")
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
                # os.remove(downloaded_a_path)
                # os.remove(downloaded_v_path)
                return video_path
            else:
                print("All videos have are too low of quality.")
                return
        print("No videos available with both audio and video available...")
        return False





    def downloadIfYoutubeURL(self):
            url_variants = ["http://youtu.be/", "https://youtu.be/", "http://youtube.com/", "https://youtube.com/",
                            "https://m.youtube.com/", "http://www.youtube.com/", "https://www.youtube.com/"]
            if any(ext in self.source_ref for ext in url_variants):
                print("Detected Youtube Video...")
                video_dir = self.get_youtube_video()
                return video_dir
            return self.source_ref
