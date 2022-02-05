from tiktok_uploader.Cookies import Cookies
import threading
from fake_useragent import UserAgent, FakeUserAgentError
import undetected_chromedriver as uc


class Browser:
    __instance = None

    @staticmethod
    def getBrowser():
        # print("Browser.getBrowser() called")
        if Browser.__instance is None:
            with threading.Lock():
                if Browser.__instance is None:
                    # print("Creating new browser instance due to no instance found")
                    Browser.__instance = Browser()
        return Browser.__instance

    def __init__(self):
        if Browser.__instance is not None:
            raise Exception("This class is a singleton!")
        else:
            Browser.__instance = self
        self.user_agent = ""
        options = uc.ChromeOptions()
        self.browser = uc.Chrome(options=options)
        self.cookie = Cookies.getCookies(self)
        self._setUserAgent()

    def _setUserAgent(self):
        try:
            self.user_agent = UserAgent().random
        except FakeUserAgentError:
            self.user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.97 Safari/537.36"

    def getWebDriver(self):
        return self.browser

    def load_with_cookies(self):
        self.cookie.selectCookies()
        self.browser.refresh()

    def add_cookie(self, cookie):
        self.browser.add_cookie(cookie)

    def get_cookies(self):
        return self.browser.get_cookies()

    def get(self, url):
        self.browser.get(url)


if __name__ == "__main__":
    import os
    # get current relative path of this file.
    print(os.path.dirname(os.path.abspath(__file__)))
