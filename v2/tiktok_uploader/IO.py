import sys
import threading, pickle, os

class IO:

    __instance = None

    @staticmethod
    def getInstance(file_path=None):
        if IO.__instance is None:
            with threading.Lock():
                if IO.__instance is None:
                    IO.__instance = IO(file_path)
        return IO.__instance


    def __init__(self, file_path=None):
        if IO.__instance is not None:
            raise Exception("This class is a singleton!")
        else:
            IO.__instance = self
            if not file_path:
                file_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "config.txt")

        # Parse config file.
        self.file_path = file_path
        self.cookie_file_dir = self.video_save_dir = self.hashtag_file = self.schedule_file = None
        self.log_file_dir = None
        self.default_font = None
        self.default_font_size = None
        self.default_text_foreground_color = None
        self.default_text_background_color = None
        self.tiktok_dimension = (1920, 1080)
        self.temp_youtube_vid_dir = None
        self.lang = None
        self.base_url = None
        self.magick_path = None
        self.parseConfig()
        self._setImageMagick()

    def parseConfig(self):
        with open(self.file_path, "r") as f:
            for line in f:
                if line.startswith("#"):
                    continue
                elif line.startswith("DEFAULT_COOKIE_DIR"):
                    self.cookie_file_dir = line.split("=")[1].strip().replace('"', '')
                elif line.startswith("VIDEO_SAVE_DIR"):
                    self.video_save_dir = line.split("=")[1].strip().replace('"', '')
                elif line.startswith("HASHTAG_FILE"):
                    self.hashtag_file = line.split("=")[1].strip().replace('"', '')
                elif line.startswith("SCHEDULE_FILE"):
                    self.schedule_file = line.split("=")[1].strip().replace('"', '')
                elif line.startswith("LOG_FILE_DIR"):
                    self.log_file_dir = line.split("=")[1].strip().replace('"', '')
                elif line.startswith("DEFAULT_FONT"):
                    self.default_font = line.split("=")[1].strip().replace('"', '')
                elif line.startswith("DEFAULT_FONT_SIZE"):
                    self.default_font_size = line.split("=")[1].strip().replace('"', '')
                elif line.startswith("DEFAULT_TEXT_FOREGROUND_COLOR"):
                    self.default_text_foreground_color = line.split("=")[1].strip().replace('"', '')
                elif line.startswith("DEFAULT_TEXT_BACKGROUND_COLOR"):
                    self.default_text_background_color = line.split("=")[1].strip().replace('"', '')
                elif line.startswith("TIKTOK_DIM"):
                    self.tiktok_dimension = tuple(line.split("=")[1].strip())
                elif line.startswith("TEMP_YOUTUBE_VID_DIR"):
                    self.temp_youtube_vid_dir = line.split("=")[1].strip().replace('"', '')
                elif line.startswith("LANG"):
                    self.lang = line.split("=")[1].strip().replace('"', '')
                elif line.startswith("BASE_URL"):
                    self.base_url = (line.split("=")[1].strip()+"=").replace('"', '')
                elif line.startswith("IMAGEMAGICK_BINARY"):
                    self.magick_path = line.split("=")[1].strip().replace('"', '')
                else:
                    print("Error reading config file, Please check your config file!")
                    sys.exit()


    def pickle_load(self, file_path) -> object:
        return pickle.load(open(file_path, "rb"))

    def pickle_dump(self, obj, file_path):
        pickle.dump(obj, open(file_path, "wb"))

    def listdir(self, path):
        """ List directory """
        return os.listdir(path)

    # Getter functions.
    def getVideoSaveDir(self):
        """ Get video save directory """
        return self.video_save_dir

    def getCookieDir(self):
        """ Get cookie file directory """
        return self.cookie_file_dir

    def getHashtagFile(self):
        """ Get hashtag file """
        return self.hashtag_file

    def getScheduleFileDir(self):
        """ Get schedule file directory """
        return self.schedule_file

    def getLogFileDir(self):
        """ Get log file directory """
        return self.log_file_dir

    def getDefaultFont(self):
        """ Get default font """
        return self.default_font

    def getDefaultFontSize(self):
        """ Get default font size """
        return self.default_font_size

    def getDefaultTextForegroundColor(self):
        """ Get default text foreground color """
        return self.default_text_foreground_color

    def getDefaultTextBackgroundColor(self):
        """ Get default text background color """
        return self.default_text_background_color

    def getTiktokDimension(self) -> tuple:
        """ Get tiktok dimension """
        return self.tiktok_dimension

    def getTempYoutubeVidDir(self):
        """ Get temp youtube video directory """
        return self.temp_youtube_vid_dir

    def getLang(self):
        """ Get lang """
        return self.lang

    def getBaseUrl(self):
        """ Get base url """
        return self.base_url

    def getMagickPath(self):
        """ Get magick path """
        return self.magick_path

    # General functions.
    def getHashTagsFromFile(self) -> iter:
        """ Get hashtags from hash tag file """
        with open(self.getHashtagFile(), "r") as f:
            for line in f:
                yield line.strip()


    def _setImageMagick(self):
        # "C:\Program Files\ImageMagick-6.8.8-Q16\magick.exe
        # Find ImageMagick path using above format.
        os.environ['IMAGEMAGICK_BINARY'] = self.getMagickPath()




# Testing
if __name__ == "__main__":
    io = IO()
    base_url = io.getBaseUrl() + io.getLang()
    print(base_url)
    magic_path = io.getMagickPath()
    print(magic_path)