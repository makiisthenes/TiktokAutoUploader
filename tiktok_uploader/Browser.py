from .cookies import load_cookies_from_file, save_cookies_to_file
from fake_useragent import UserAgent, FakeUserAgentError
import undetected_chromedriver as uc
import threading, os


WITH_PROXIES = False
PROXIES = ["8.219.176.202:8080"]

class Browser:
    __instance = None

    @staticmethod
    def get():
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
        if WITH_PROXIES:
            options.add_argument('--proxy-server={}'.format(PROXIES[0]))
        self._driver = uc.Chrome(options=options)
        self.with_random_user_agent()

    def with_random_user_agent(self, fallback=None):
        """Set random user agent.
        NOTE: This could fail with `FakeUserAgentError`.
        Provide `fallback` str to set the user agent to the provided string, in case it fails. 
        If fallback is not provided the exception is re-raised"""

        try:
            self.user_agent = UserAgent().random
        except FakeUserAgentError as e:
            if fallback:
                self.user_agent = fallback
            else:
                raise e

    @property
    def driver(self):
        return self._driver

    def load_cookies_from_file(self, filename):
        cookies = load_cookies_from_file(filename)
        for cookie in cookies:
            self._driver.add_cookie(cookie)
        self._driver.refresh()

    def save_cookies(self, filename: str, cookies:list=None):
        save_cookies_to_file(cookies, filename)


if __name__ == "__main__":
    import os
    # get current relative path of this file.
    print(os.path.dirname(os.path.abspath(__file__)))
