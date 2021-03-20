# This class will be in charge of uploading videos onto tiktok.
import os, time, random
from pytube import YouTube
from selenium.webdriver.common.by import By
from selenium.webdriver.support.wait import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

import utils
from Bot import Bot
from Cookies import Cookies
from IO import IO
from Video import Video

# TODO: Decouple Bot functionality in Upload Class


class Upload:
    def __init__(self, user):
        self.bot = Bot().getBot()
        self.url = "https://www.tiktok.com/upload?lang=en"
        self.cookies = Cookies()
        self.userRequest = {"dir":"", "cap": "", "vidTxt": ""}
        self.video = None
        self.IO = IO("hashtags.txt")
        self.videoFormats = ["mov", "flv", "avi"]
        self.userPreference = user


    def uploadVideo(self, video_dir, videoText, startTime=0, endTime=0, private=True):
        video_dir = self.downloadIfYoutubeURL(video_dir)
        self.userRequest["dir"] = os.path.join(video_dir)
        self.checkFileExtensionValid()
        self.userRequest["cap"] = self.IO.getHashTagsFromFile()
        self.bot.get(self.url)
        self.userRequest["vidTxt"] = videoText
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
            self.bot.execute_script(
            'document.getElementsByClassName("radio-group")[0].children[0].click()')  # public video selection
        utils.randomTimeQuery()
        # self.bot.execute_script('document.getElementsByClassName("btn-post")[0].click()')  # upload button
        input("Exit")


    def addCaptions(self):
        # Add div elements to dom.
        self.bot.implicitly_wait(3)
        self.bot.execute_script(f'var element = document.getElementsByClassName("public-DraftStyleDefault-block")[0].children[0].getAttribute("data-offset-key");')
        caption_elem = self.bot.find_elements_by_class_name("public-DraftStyleDefault-block")[0]
        for hashtag in self.IO.getHashTagsFromFile():
            caption_elem.send_keys(hashtag)


    def inputVideo(self, startTime=0, endTime=0):
        WebDriverWait(self.bot, 10).until(EC.presence_of_element_located((By.CLASS_NAME, "upload-btn-input")))
        file_input_element = self.bot.find_elements_by_class_name("upload-btn-input")[0]
        # Check if file has correct .mp4 extension, else throw error.
        self.video = Video(self.userRequest["dir"], self.userRequest["vidTxt"])
        self.video.createVideo()
        if not startTime == 0 and endTime == 0:
            self.video.customCrop(startTime, endTime)
        while not os.path.exists(self.userRequest["dir"]):  # Wait for path to exist
            time.sleep(1)
        abs_path = os.path.join(os.getcwd(), self.userRequest["dir"])
        file_input_element.send_keys(abs_path)



    def checkFileExtensionValid(self):
        if self.userRequest["dir"].endswith('.mp4'):
            pass
        else:
            self.bot.close()
            exit(f"File: {self.userRequest['dir']} has wrong file extension.")


    def downloadIfYoutubeURL(self, video_dir):
        if "www.youtube.com/" in video_dir:
            print("Detected Youtube Video...")
            video = YouTube(video_dir)
            [print(i) for i in video.streams.filter(file_extension="mp4").all()]
            index = input("Enter iTag value of video you want to use:: ")
            while type(index) != int:
                try:
                    index = int(index)
                except Exception as e:
                    index = input("Please enter an integer, iTag value of video you want to use:: ")
            random_filename = str(int(time.time()))
            video_path = os.path.join(self.userPreference.video_save_dir, random_filename)+".mp4"
            video.streams.get_by_itag(int(index)).download(output_path=self.userPreference.video_save_dir, filename=random_filename)
            return video_path
        return video_dir

    @staticmethod
    def checkTiktokStatus():
        pass


if __name__ == "__main__":
    # Upload Test Code
    pass