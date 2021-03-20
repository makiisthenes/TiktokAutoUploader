import os
# Class is in charge with dealing with users preferences and directories of files.
class User:
    def __init__(self, video_save_dir):
        self._checkFileDirExist(video_save_dir)
        self.video_save_dir = video_save_dir

    def _checkFileDirExist(self, video_save_dir):
        os.makedirs(video_save_dir, exist_ok=True)