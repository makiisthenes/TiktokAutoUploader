from .basics import eprint


class Config:
    _DEFAULT_OPTIONS = {
        "COOKIES_DIR": "./CookiesDir",
        "VIDEOS_DIR": "./VideosDirPath",
        "POST_PROCESSING_VIDEO_PATH": "./VideosDirPath",
        "IMAGEMAGICK_FONT": "Arial", 
        "IMAGEMAGICK_FONT_SIZE": 80,
        "IMAGEMAGICK_TEXT_FOREGROUND_COLOR": "white",
        "IMAGEMAGICK_TEXT_BACKGROUND_COLOR": "black",
        "TIKTOK_VIDEO_SIZE": (1920, 1080), 
        "TMP_YOUTUBE_VIDEO_DIR": "",
        "LANG": "en", 
        "TIKTOK_BASE_URL": "https://www.tiktok.com/upload?lang=", 
        "IMAGEMAGICK_BINARY": ""
    }

    _EXCLUDE = ["#"]

    _instance = None

    def __init__(self, path=None) -> None:
        if not Config._instance:
            Config._instance = self
            if not path:
                self._options = Config._DEFAULT_OPTIONS
                self.path = None
            else:
                self.path = path
                self._options = {}

    @staticmethod
    def get():
        if not Config._instance:
            Config._instance = Config()
        
        return Config._instance
    
    @staticmethod
    def load(path: str):
        config = Config(path)
        with open(path, "r") as f:
            for line in f:
                if len(line) > 0 and line[0] in Config._EXCLUDE:
                    continue
                valid = False
                for opt_name in Config._DEFAULT_OPTIONS.keys():
                    if line.startswith(opt_name):
                        valid = True
                        if opt_name == "TIKTOK_DIM":
                            config._insert_option(opt_name, tuple(line.split("=")[1].strip()))
                        else:
                            config._insert_option(opt_name, Config._parse_basic_option(line))
                                                  
                if not valid:
                    eprint("Error reading config file, Please check your config file!")

        Config._instance = config
        return config

    @staticmethod
    def _parse_basic_option(line: str):
        return line.split("=")[1].strip().replace('"', '')

    def get_option_by_name(self, opt_name: str):
        return self._options.get(opt_name)
    
    def _insert_option(self, opt_name: str, value):
        self._options[opt_name] = value

    @property
    def cookies_dir(self):
        """Path where selenium cookies are stored"""
        return self.get_option_by_name("COOKIES_DIR")

    @property
    def videos_dir(self):
        """Directory where videos are stored"""
        return self.get_option_by_name("VIDEOS_DIR")
    
    @property
    def post_processing_video_path(self):
        """Directory where video are saved after processing"""
        return self.get_option_by_name("POST_PROCESSING_VIDEO_PATH")

    @property
    def imagemagick_font(self):
        """Font used for video overlays by ImageMagick lib"""
        return self.get_option_by_name("IMAGEMAGICK_FONT")
    
    @property
    def imagemagick_font_size(self):
        """Font size used for video overlays by ImageMagick lib"""
        return self.get_option_by_name("IMAGEMAGICK_FONT_SIZE")
    
    @property
    def imagemagick_text_foreground_color(self):
        """Text foreground colour used for video overlays by ImageMagick lib"""
        return self.get_option_by_name("IMAGEMAGICK_TEXT_FOREGROUND_COLOR")

    @property
    def imagemagick_text_background_color(self):
        """Text background colour used for video overlays by ImageMagick lib"""
        return self.get_option_by_name("IMAGEMAGICK_TEXT_BACKGROUND_COLOR")
    
    @property
    def tiktok_video_size(self) -> tuple:
        """ Get tiktok dimension """
        return self.get_option_by_name("TIKTOK_VIDEO_SIZE")
    
    @property
    def tmp_youtube_video_dir(self):
        """Directory where YT videos are stored temporarily"""
        return self.get_option_by_name("TMP_YOUTUBE_VIDEO_DIR")
    
    @property
    def lang_preference(self):
        """Language preference"""
        return self.get_option_by_name("LANG")

    @property
    def tiktok_base_url(self):
        """Tiktok base url"""
        return self.get_option_by_name("TIKTOK_BASE_URL")

    @property
    def imagemagick_binary_path(self):
        """ImageMagick Binary path """
        return self.get_option_by_name("IMAGEMAGICK_BINARY")
