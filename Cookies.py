import os, pickle
from os.path import exists


class Cookies:
    def __init__(self, bot):
        self.bot = bot
        self.cookies_dir = os.path.join(os.getcwd(), "CookiesDir")
        if not exists(self.cookies_dir):
            os.mkdir(self.cookies_dir)
        self.selectCookie()


    def selectCookie(self):
        if len(os.listdir(self.cookies_dir)) > 0:
            print("Select Cookie number that you want to use:: ")
            cookies_dict = dict(enumerate(os.listdir(self.cookies_dir)))
            for index, filename in enumerate(os.listdir(self.cookies_dir)):
                print(f"({index}) --> {filename}")
            print("(a) --> Add NEW Cookie.")
            selected = None
            while type(selected) is not int or not 0 <= selected < len(os.listdir(self.cookies_dir)):
                try:
                    selection = input("Please select an integer representing a cookie::")
                    selected = int(selection)
                except ValueError:
                    if selection == "a":
                        self.createCookie()
                        return
                    pass

            selected_cookie = cookies_dict[selected]
            self.loadCookies(selected_cookie)
        else:
            print("No cookies stored on save directory!")
            self.createCookie()


    def loadCookies(self, selected_cookie):
        cookie_path = os.path.join(self.cookies_dir, selected_cookie)
        cookie_data = pickle.load(open(cookie_path, "rb"))
        for cookie in cookie_data:
            self.bot.add_cookie(cookie)


    def createCookie(self):
        print("Your browser currently shows the tiktok login page, please login in.")
        input("After you have logged in fully, please press any button to continue...")
        print("#####")
        filename = input("Please enter a name for the cookie to be stored as::: ")
        cookie_path = os.path.join(self.cookies_dir, filename+".cookie")
        pickle.dump(self.bot.get_cookies(), open(cookie_path, "wb+"))
        print("Cookie has been created successfully, resuming upload!")
