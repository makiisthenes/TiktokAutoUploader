# This class will be in charge of uploading videos onto tiktok.
import os, time
from Bot import Bot
import sys
import utils
from Browser import Browser
from Cookies import Cookies
from IO import IO
from Video import Video
from selenium.common.exceptions import StaleElementReferenceException

PROTECTED_FILES = ["processed.mp4", "VideosSaveHere.txt"]

class Upload:
    def __init__(self, user):
        self.bot = None
        self.lang = "en"
        self.url = f"https://www.tiktok.com/upload?lang={self.lang}"
        self.cookies = None
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
            self.webbot = Bot(self.bot)

        self.userRequest["dir"] = video_dir
        self.checkFileExtensionValid()
        self.userRequest["cap"] = self.IO.getHashTagsFromFile()
        # Initiate bot if isn't already.
        self.bot.get(self.url)
        self.userRequest["vidTxt"] = videoText

        # Cookies loaded here.
        self.cookies = Cookies(self.bot)
        self.bot.refresh()

        # User now has logged on and can upload videos
        time.sleep(3)
        self.inputVideo(startTime, endTime)
        self.addCaptions()
        utils.randomTimeQuery()
        if private:
            self.webbot.selectPrivateRadio()  # private video selection
        else:
            self.webbot.selectPublicRadio()  # public video selection
        utils.randomTimeQuery()
        if not test:
            self.webbot.uploadButtonClick()  # upload button
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
            sys.exit(f"File: {self.userRequest['dir']} has wrong file extension.")


    # This gets the hashtags from file and adds them to the website input
    def addCaptions(self, hashtag_file=None):
        if not hashtag_file:
            caption_elem = self.webbot.getCaptionElem()
            for hashtag in self.IO.getHashTagsFromFile():
                caption_elem.send_keys(hashtag)

    def clearCaptions(self):
        caption_elem = self.webbot.getCaptionElem()
        caption_elem.send_keys("")

    def inputScheduler(self, schdate, schtime):
        # In charge of selecting scheduler in the input.
        utils.randomTimeQuery()
        self.webbot.selectScheduleToggle()


    # This is in charge of adding the video into tiktok input element.
    def inputVideo(self, startTime=0, endTime=0):
        try:
            file_input_element = self.webbot.getVideoUploadInput()
        except Exception as e:
            print("Major error, cannot find the upload button, please update getVideoUploadInput() in Bot.py")
            print(f"Actual Error: {e}")
            file_input_element = ""
            sys.exit()
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


    def downloadIfYoutubeURL(self, video_dir) -> str:
        """
        Function will determine whether given video directory is a youtube link, returning the downloaded video path
        Else it will just return current path.
        """

        url_variants = ["http://youtu.be/", "https://youtu.be/", "http://youtube.com/", "https://youtube.com/",
                        "https://m.youtube.com/", "http://www.youtube.com/", "https://www.youtube.com/"]
        if any(ext in video_dir for ext in url_variants):
            print("Detected Youtube Video...")
            video_dir = Video.get_youtube_video(self.userPreference, video_dir)
        return video_dir


    def directUpload(self, filename, private=False, test=False):
        if self.bot is None:
            self.bot = Browser().getBot()
            self.webbot = Bot(self.bot)
        self.bot.get(self.url)
        utils.randomTimeQuery()
        self.cookies = Cookies(self.bot)
        self.bot.refresh()

        try:
            file_input_element = self.webbot.getVideoUploadInput()
        except Exception as e:
            print(f"Error: {e}")
            print("Major error, cannot find the file upload button, please update getVideoUploadInput() in Bot.py")
            file_input_element = None
            sys.exit()
        abs_path = os.path.join(os.getcwd(), filename)
        try:
            file_input_element.send_keys(abs_path)
        except StaleElementReferenceException as e:
            try:
                self.bot.implicitly_wait(5)
                file_input_element = self.webbot.getVideoUploadInput()
                file_input_element.send_keys(abs_path)
            except Exception as e:
                print("Major error, cannot find the file upload button, please update getVideoUploadInput() in Bot.py")
                sys.exit()


        # We need to wait until it is uploaded and then clear input.

        self.addCaptions()
        utils.randomTimeQuery()
        if private:
            self.webbot.selectPrivateRadio()  # private video selection
            utils.randomTimeQuery()
        else:
            """
            self.webbot.selectPublicRadio()  # public video selection
            utils.randomTimeQuery()
            """
            pass
        if not test:

            self.webbot.uploadButtonClick()  # upload button
        input("Press any button to exit")