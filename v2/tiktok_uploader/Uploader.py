from .Task import Task
from .WebBot import WebBot
from .IO import IO
import os, time
from random import randint

class Uploader(Task):
    def __init__(self, video_path):
        super().__init__(video_path)
        self.webbot = WebBot()
        self.io = IO.getInstance()
        self.base_url = self.io.getBaseUrl() + self.io.getLang()

    def uploadVideo(self, private=False):
        self.browser.get(self.base_url)
        self.browser.load_with_cookies()
        time.sleep(randint(1, 3))
        self.addHashTags()
        if private:
            self.webbot.selectPrivateRadio()
        else:
            self.webbot.selectPublicRadio()
        time.sleep(randint(1, 3))
        self.inputVideo()
        time.sleep(randint(1, 3))
        self.webbot.uploadButtonClick()
        # print("Uploading...")

    def addHashTags(self):
        caption_elem = self.webbot.getCaptionElem()
        for hashtag in self.io.getHashTagsFromFile():
            caption_elem.send_keys(hashtag)

    def clearHashTags(self):
        caption_elem = self.webbot.getCaptionElem()
        caption_elem.send_keys("")

    def inputVideo(self):
        file_input_element = self.webbot.getVideoUploadInput()
        abs_path = os.path.join(os.getcwd(), self.video_path)
        file_input_element.send_keys(abs_path)
