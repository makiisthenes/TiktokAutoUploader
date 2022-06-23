import os
# Class is in charge with dealing with users preferences and directories of files.
class User:
    def __init__(self, video_save_dir=None):
        if not video_save_dir:
            video_save_dir = "VideosDirPath"
        self._checkFileDirExist(video_save_dir)
        self.video_save_dir = video_save_dir
        self._checkFileDirExist("VideosDirPath")
        self._checkFileDirExist("VideoUploadQueue")
        self._checkFileDirExist("CookiesDir")

    @staticmethod
    def _checkFileDirExist(video_save_dir):
        os.makedirs(video_save_dir, exist_ok=True)
