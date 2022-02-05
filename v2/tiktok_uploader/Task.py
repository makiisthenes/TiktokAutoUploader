from .Browser import Browser
from abc import ABC, abstractmethod


class Task(ABC):
    def __init__(self, video_path):
        self.video_path = video_path
        self.user_data = None  # IO class reference.
        self.browser = Browser.getBrowser()

