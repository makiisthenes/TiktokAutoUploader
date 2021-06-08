import datetime, ast
from selenium.webdriver.common.by import By
from selenium.webdriver.support.wait import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

from IO import IO
from Browser import Browser
from Upload import Upload
DEFAULT_TIME = "20:10"


# Class in charge of scheduling uploads at different times read from a csv file.

def next_day():
    date_obj = datetime.datetime.now(tz=None) + datetime.timedelta(days=1)
    date_string = date_obj.strftime("%d/%m/%Y")
    return date_string


class Scheduler:
    def __init__(self, user):
        self.IO = IO("hashtags.txt", "schedule.csv")
        self.upload = Upload(user)

    def printSchedule(self):
        self.IO.get_schedule_csv(True)

    def get_data(self):
        return self.IO.get_schedule_csv(False)


    def getNextAvailableDate(self):
        # This will only allow one video to be uploaded a day at a specific time.
        data = self.get_data()
        if data:
            # print(f"Data: {data[-1]}")
            date = data[-1][4]  # Last date known.
            day, month, year = date.split("/")
            date_obj = datetime.datetime(int(year), int(month), int(day))
            if date_obj > datetime.datetime.now():
                date_obj += datetime.timedelta(days=1)
                date_string = date_obj.strftime("%d/%m/%Y")
                return date_string
            return next_day()
        return next_day()

    def scheduleVideo(self, url, caption, startTime, endTime, date=None, time=DEFAULT_TIME):
        if date is None:
            date = self.getNextAvailableDate()
        row = [url, caption, startTime, endTime, date, time]
        self.IO.add_schedule_row(row)
        self.upload.uploadVideo(url, caption, startTime=startTime, endTime=endTime, private=False, test=True, scheduled=False, schdate=date, schtime=DEFAULT_TIME)

    def submit_all_schedule(self):
        # Submits all scheduled videos.
        pass


