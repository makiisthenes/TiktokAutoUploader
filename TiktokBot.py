from Upload import Upload
from User import User
from TaskScheduler import Scheduler
import shutil, os

# Class controls the overall running of the system with control of uploading etc.
class TiktokBot:
    def __init__(self, video_save_dir=None):
        # TODO: Get rid of self.user parameter needed in all classes and make it a parameter in utils.
        self.user = User() if not video_save_dir else User(video_save_dir)
        self.upload = Upload(self.user)
        self.schedule = Scheduler(self.user)
        self.dir = video_save_dir
        self.clearDir()

    def clearDir(self):
        # self.upload = None
        if self.dir:
            shutil.rmtree(self.dir)
            os.makedirs(self.dir)



