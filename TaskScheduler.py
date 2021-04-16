import csv
from IO import IO
from selenium.webdriver.common.by import By
from selenium.webdriver.support.wait import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
# Class in charge of scheduling uploads at different times read from a csv file.



# This class will read the csv file and al
class Scheduler:
    def __init__(self):
        self.IO = IO("schedule.csv")

