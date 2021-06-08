import os
# Class is in charge with dealing with users preferences and directories of files.
class User:
    def __init__(self, video_save_dir):
        self._checkFileDirExist(video_save_dir)
        self.video_save_dir = video_save_dir
        self._checkFileDirExist("VideosDirPath")
        self._checkFileDirExist("VideoUploadQueue")
        self._checkFileDirExist("CookiesDir")

    def _checkFileDirExist(self, video_save_dir):
        os.makedirs(video_save_dir, exist_ok=True)

if __name__ == "__main__":
    User("VideosDirPath")  # Testing directory creation.