import csv, ast
from csv import writer


def append_list_as_row(file_name, list_of_elem):
    # Open file in append mode
    with open(file_name, 'a+', newline='') as write_obj:
        # Create a writer object from csv module
        csv_writer = writer(write_obj)
        # Add contents of list as last row in the csv file
        csv_writer.writerow(list_of_elem)


class IO:
    # This class deals with loading IO Files, such as hashtag files .
    def __init__(self, hash_dir, schedule_dir):
        self.hash_dir = hash_dir
        self.schedule_dir = schedule_dir

    def getHashTagsFromFile(self):
        with open(self.hash_dir, "r") as f:
            lines = f.readlines()
            temp =[]
            for line in lines:
                line = line.replace("\n", "")
                temp.append(line)
                temp.append(" ")
            lines = temp
        return lines

    def get_schedule_csv(self, print_choice):
        with open(self.schedule_dir, "r") as f:
            reader = csv.reader(f, delimiter=",")
            csv_data = []
            for i, line in enumerate(reader):
                if print_choice:
                    if line:
                        # [print(line[i]) for i in range(7)]
                        print(line)
                if i != 0:
                    if line:
                        uploaded = ast.literal_eval(line[6].strip())
                        if not uploaded:
                            row = [line[0], line[1], int(line[2]), int(line[3]), line[4], line[5], ast.literal_eval(line[6].strip())]
                            csv_data.append(row)
            if csv_data:
                return csv_data
            return False

    def add_schedule_row(self, line):
        line.append(False)
        append_list_as_row(self.schedule_dir, line)



if __name__ == "__main__":
    IO("hashtags.txt", "schedule.csv").getHashTagsFromFile()