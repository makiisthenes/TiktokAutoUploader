from selenium import webdriver
from selenium.webdriver.chrome.options import Options
import os
# https://stackoverflow.com/questions/33225947/can-a-website-detect-when-you-are-using-selenium-with-chromedriver


# Class used to create undetectable selenium bot
class Bot:
    def __init__(self):
        self.user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.169 Safari/537.36"
        options = Options()
        options.add_argument("window-size=1280,800")
        options.add_argument("user-agent=" + self.user_agent)
        options.add_argument('--disable-extensions')
        options.add_argument('--profile-directory=Default')
        options.add_argument("--incognito")
        options.add_argument("--disable-plugins-discovery")
        options.add_argument("--start-maximized")

        # For older ChromeDriver under version 79.0.3945.16
        options.add_experimental_option("excludeSwitches", ["enable-automation"])
        options.add_experimental_option('useAutomationExtension', False)
        # For ChromeDriver version 79.0.3945.16 or over
        options.add_argument('--disable-blink-features=AutomationControlled')
        self.bot = webdriver.Chrome(chrome_options=options)
        self.bot.delete_all_cookies()

    def getBot(self):
        return self.bot

    @staticmethod
    def createUndetectedChromeDriver():
        # In charge of removing tell-tale variable names that show its a automation bot in Javascript. PERL required.
        chromedriver_path = os.path.join(os.getcwd(), "chromedriver.exe")
        os.popen(f"perl - pi - e 's/cdc_/dog_/g' '{chromedriver_path}'")


if __name__ == "__main__":
    Bot.createUndetectedChromeDriver()