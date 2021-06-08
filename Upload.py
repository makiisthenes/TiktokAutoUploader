# This class will be in charge of uploading videos onto tiktok.
import os, time, random
from pytube import YouTube
from selenium.webdriver.common.by import By
from selenium.webdriver.support.wait import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

import utils, asyncio
from Browser import Browser
from Cookies import Cookies
from IO import IO
from Video import Video
from moviepy.editor import VideoFileClip, AudioFileClip

# TODO: Decouple Bot functionality in Upload Class
# TODO: Decouple Video Class Functionality in Youtube Section.


PROTECTED_FILES = ["processed.mp4", "VideosSaveHere.txt"]


class Upload:
    def __init__(self, user):
        self.bot = None
        self.url = "https://www.tiktok.com/upload?lang=en"
        self.cookies = Cookies()
        self.userRequest = {"dir": "", "cap": "", "vidTxt": ""}
        self.video = None
        self.IO = IO("hashtags.txt", "schedule.csv")
        self.videoFormats = ["mov", "flv", "avi"]
        self.userPreference = user


    # Class used to upload video.
    def uploadVideo(self, video_dir, videoText, startTime=0, endTime=0, private=True, test=False, scheduled=False, schdate="", schtime=""):

        video_dir = self.downloadIfYoutubeURL(video_dir)
        if not video_dir:
            return

        if self.bot is None:
            self.bot = Browser().getBot()

        self.userRequest["dir"] = video_dir
        self.checkFileExtensionValid()
        self.userRequest["cap"] = self.IO.getHashTagsFromFile()
        # Initiate bot if isn't already.
        self.bot.get(self.url)
        self.userRequest["vidTxt"] = videoText


        # Cookies loaded here.
        if self.cookies.loadCookies(self.bot):
            self.bot.refresh()
        else:
            # User needs to sign in first...
            input("Please sign in and do captcha to save captcha.\nPress any button to continue...")
            self.cookies.writeCookie(self.bot.get_cookies())



        # User now has logged on and can upload videos
        time.sleep(3)
        self.inputVideo(startTime, endTime)
        self.addCaptions()
        utils.randomTimeQuery()
        if private:
            self.bot.execute_script(
                'document.getElementsByClassName("radio-group")[0].children[2].click()')  # private video selection
        else:
            self.bot.execute_script('document.getElementsByClassName("radio-group")[0].children[0].click()')  # public video selection
        utils.randomTimeQuery()
        if not test:
            self.bot.execute_script('document.getElementsByClassName("btn-post")[0].click()')  # upload button
        input("Press any button to exit")

    def createVideo(self, video_dir, videoText, startTime=0, endTime=0):
        video_dir = self.downloadIfYoutubeURL(video_dir)
        if not video_dir:
            return
        self.inputVideo(startTime, endTime)
        self.addCaptions()
        print(f"Video has been created: {self.dir}")


    # Method to check file is valid.
    def checkFileExtensionValid(self):
        if self.userRequest["dir"].endswith('.mp4'):
            pass
        else:
            self.bot.close()
            exit(f"File: {self.userRequest['dir']} has wrong file extension.")


    # This gets the hashtags from file and adds them to the website input
    def addCaptions(self):
        # Add div elements to dom.
        self.bot.implicitly_wait(3)
        self.bot.execute_script(f'var element = document.getElementsByClassName("public-DraftStyleDefault-block")[0].children[0].getAttribute("data-offset-key");')
        caption_elem = self.bot.find_elements_by_class_name("public-DraftStyleDefault-block")[0]
        for hashtag in self.IO.getHashTagsFromFile():
            caption_elem.send_keys(hashtag)


    def inputScheduler(self, schdate, schtime):
        # In charge of selecting scheduler in the input.
        schedule_toggle = self.bot.find_elements_by_class_name("switch-container")[0]
        utils.randomTimeQuery()
        schedule_toggle.click()


    # This is in charge of adding the video into tiktok input element.
    def inputVideo(self, startTime=0, endTime=0):
        WebDriverWait(self.bot, 10).until(EC.presence_of_element_located((By.CLASS_NAME, "upload-btn-input")))
        file_input_element = self.bot.find_elements_by_class_name("upload-btn-input")[0]
        # Check if file has correct .mp4 extension, else throw error.
        self.video = Video(self.userRequest["dir"], self.userRequest["vidTxt"], self.userPreference)
        print(f"startTime: {startTime}, endTime: {endTime}")
        if startTime != 0 and endTime != 0 or endTime != 0:
            print(f"Cropping Video timestamps: {startTime}, {endTime}")
            self.video.customCrop(startTime, endTime)
        # Crop first and then make video.
        self.video.createVideo()  # Link to video class method
        while not os.path.exists(self.video.dir):  # Wait for path to exist
            time.sleep(1)
        abs_path = os.path.join(os.getcwd(), self.video.dir)
        file_input_element.send_keys(abs_path)


    # This is in charge of determining if is youtube url and downloading video if available.
    def downloadIfYoutubeURL(self, video_dir):
        # https://stackoverflow.com/questions/6556559/youtube-api-extract-video-id/6556662#6556662
        url_variants = ["http://youtu.be/", "https://youtu.be/", "http://youtube.com/", "https://youtube.com/", "https://m.youtube.com/", "http://www.youtube.com/", "https://www.youtube.com/"]
        # if "www.youtube.com/" in video_dir:
        if any(ext in video_dir for ext in url_variants):
            print("Detected Youtube Video...")
            video = YouTube(video_dir).streams.filter(file_extension="mp4", adaptive=True).first()
            audio = YouTube(video_dir).streams.filter(file_extension="webm", only_audio=True, adaptive=True).first()
            if video and audio:
                random_filename = str(int(time.time()))  # extension is added automatically.
                video_path = os.path.join(self.userPreference.video_save_dir, "pre-processed")+".mp4"
                resolution = int(video.resolution[:-1])
                if resolution >= 360:
                    video.download(output_path="VideosDirPath", filename=random_filename)
                    print("Downloaded Video File @ " + video.resolution)
                    audio.download(output_path="VideosDirPath", filename="a" + random_filename)
                    print("Downloaded Audio File")
                    file_check_iter = 0
                    while not os.path.exists("VideosDirPath\\" + random_filename + ".mp4") and os.path.exists("VideosDirPath\\" + "a" + random_filename + ".webm"):
                        time.sleep(1)
                        file_check_iter=+1
                        if file_check_iter > 10:
                            print("Error saving these files to directory, please try again")
                            return
                    video = VideoFileClip(os.path.join(self.userPreference.video_save_dir, random_filename + ".mp4"))
                    audio = AudioFileClip(os.path.join(self.userPreference.video_save_dir, "a" + random_filename + ".webm"))
                    composite_video = video.set_audio(audio)
                    # composite_video = composite_video.subclip(t_start=0, t_end=3)
                    composite_video.write_videofile(video_path)
                    return video_path
                else:
                    print("All videos have are too low of quality.")
                    return
            print("No videos available with both audio and video available...")
            return False
        return video_dir



if __name__ == "__main__":
    from User import User
    from Video import Video
    from moviepy.editor import VideoFileClip, AudioFileClip
    from moviepy.video.io.ffmpeg_tools import ffmpeg_extract_subclip  # not needed
    # Upload Test Code
    '''
        video = YouTube("https://www.youtube.com/watch?v=-doMNIdooe8").streams.filter(file_extension="mp4", adaptive=True).first()
        audio = YouTube("https://www.youtube.com/watch?v=-doMNIdooe8").streams.filter(file_extension="webm", only_audio=True, adaptive=True).first()
        if video and audio:
            resolution = int(video.first().resolution[:-1])
            if resolution < 360:
                print("All videos have are too low of quality.")
    
            random_filename = str(int(time.time()))
    
            video.download(output_path="VideosDirPath", filename=random_filename)
            print("Downloaded Video File")
            audio.download(output_path="VideosDirPath", filename="a"+random_filename)
            print("Downloaded Audio File")
            while not os.path.exists("VideosDirPath\\" + random_filename+".mp4") and os.path.exists("VideosDirPath\\" + "a" + random_filename+".webm"):
                time.sleep(1)
            video = VideoFileClip("VideosDirPath\\" + random_filename+".mp4")
            audio = AudioFileClip("VideosDirPath\\" + "a"+random_filename+".webm")
            # Merging both audio and video clips together.
            composite_video = video.set_audio(audio)
            composite_video = composite_video.subclip(t_start=5, t_end=8)
            composite_video.write_videofile("merged.mp4", fps=24)
    
    
    '''

    # dir = "VideosDirPath/1618578553.mp4"
    ffmpeg_extract_subclip(dir, 0, 3, targetname="1618578553.mp4")
    dir = (Upload(User("VideosDirPath")).downloadIfYoutubeURL("https://www.youtube.com/watch?v=-doMNIdooe8"))

    # Issues with cropping videos using moviepy, looking at docs or alt.
    Video(dir, "Test").customCrop(0, 3)
