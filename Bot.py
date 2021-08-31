from selenium.webdriver.common.by import By
from selenium.webdriver.support.wait import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import selenium.common




class Bot:
    """Bot used as high level interaction with web-browser via Javascript exec"""
    def __init__(self, bot):
        self.bot = bot

    def getBot(self):
        return self.bot

    def getVideoUploadInput(self):
        WebDriverWait(self.bot, 10).until(EC.presence_of_element_located((By.CLASS_NAME, "upload-btn-input")))
        file_input_element = self.bot.find_elements_by_class_name("upload-btn-input")[0]
        return file_input_element

    def getCaptionElem(self):
        # Add div elements to dom.
        self.bot.implicitly_wait(3)
        self.bot.execute_script(
            f'var element = document.getElementsByClassName("public-DraftStyleDefault-block")[0].children['
            f'0].getAttribute("data-offset-key");')
        caption_elem = self.bot.find_elements_by_class_name("public-DraftStyleDefault-block")[0]
        return caption_elem

    def selectPrivateRadio(self):
        self.click_elem(
            'document.getElementsByClassName("radio-group")[0].children[2].click()',
            "Javascript had trouble finding the 'private' toggle radio button with given selector,"
            " please submit yourself and edit submit button placement.!!")

    def selectPublicRadio(self):
        self.click_elem(
            'document.getElementsByClassName("radio-group")[0].children[0].click()',
            "Javascript had trouble finding the 'public' toggle radio button with given selector,"
            " please submit yourself and edit submit button placement.!!")

    def selectScheduleToggle(self):
        self.click_elem(
            "document.getElementsByClassName('switch-container')[0].click()",
            "Javascript had trouble finding the 'schedule' toggle radio button with given selector,"
            " please submit yourself and edit submit button placement.!!")

    def uploadButtonClick(self):
        self.click_elem(
            'document.getElementsByClassName("btn-post")[0].click()',
            "Javascript had trouble finding the Upload button with given selector,"
            " please submit yourself and edit submit button placement.!!")


    def click_elem(self, javascript_script, error_msg):
        try:
            self.bot.execute_script(javascript_script)
        except selenium.common.exceptions.JavascriptException:
            print(error_msg)
        except Exception as e:
            print(f"Unhandled Error: {e}")
            exit()
        return