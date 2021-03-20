import os

class IO:
    # This class deals with loading IO Files, such as hashtag files .
    def __init__(self, hash_dir):
        self.hash_dir = hash_dir

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


if __name__ == "__main__":
    IO("hashtags.txt").getHashTagsFromFile()