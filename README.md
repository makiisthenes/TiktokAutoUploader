# TiktokAutoUploader
Automatically Edits Videos and Uploads to Tiktok with 1 line of code.

<center>
<image src="https://user-images.githubusercontent.com/52138450/111885490-04ab6680-89c0-11eb-955a-f833577b4406.png" width="35%">
</center>

--------------------------------------
#### Issues Fixed

Previously the code had a lot of problems with many things when reviewing again: <br>
-> Files were read and being overwritten at same time, leading to corrupt and sometimes frozen video outputs.<br>
-> Sometimes when extracting youtube videos, there may not be audio available and so will continue regardless.<br>
-> The video dimensions never fit the tiktok recommended dims and so was obscured when uploaded.<br>
-> The layout for captions on the video and overall format of the video was not nice to look at.<br>
-> Cropping videos did not work properly most of the time.<br>
<br>
All these issues have now been fixed.<br>
<br>
Current Problems:<br>
-> Design and layout of classes was not thought out as well and so left it very messy and not structured well.<br>
TODO: <br>
-> Allow users to add schedule video uploads using CSV file. <br>
-> Improve structuring of code and design better one. <br>
-> Maybe add a GUI? <br>
<br>


--------------------------------------

#### Setup

> pip install -r requirements.txt

Have you installed ImageMagick on your system,

https://imagemagick.org/script/download.php

Then in site-packages, go to moviepy and edit config_defualts.py

![image](https://user-images.githubusercontent.com/52138450/111904491-27c92b00-8a3f-11eb-85ee-56bdcb4ac4c9.png)

Change this auto to your path like shown in image above.

-----------------------------------

#### Parameters

> method uploadVideo(video_dir, videoText, startTime=0, endTime=0, private=True, test=False)

By defualt test=False meaning it will upload and not stay preview for user to click upload.

Switching to test=True, it will allow you to preview.

-----------------------------------

#### Notes

Please use chromedriver.exe provided as its source code has been edited to avoid bot detection on tiktok website.

Use only tiktok accounts that can be accessed through email password on browser, OAuth2.0 may not work, slightly probable.

Do not spam upload videos as tiktok will most likely ban you after this or during the act.

I am not responsible/ liable for any damages or problems or resulting effects you face using this tool or in relation with this tool, use at own risk. 

---------------------------------

### Basic Usage Example

> if __name__ == "__main__":
> 
>     # Example Usage
>     
>     tiktok_bot = Main("VideosDirPath")
>     
>     # Use a video from your directory.
>     
>     tiktok_bot.uploadVideo("test1.mp4", "This is text \n overlay on \n the video", 1, 45)
> 
>     # Or use youtube url as video source. [Simpsons Meme 1:16 - 1:32 Example]
>     
>     tiktok_bot.uploadVideo("https://www.youtube.com/watch?v=OGEouryaQ3g", "TextOverlay", startTime=76, endTime=92, private=False)

--------------------------------
### Image Overlay Feature

![image](https://user-images.githubusercontent.com/52138450/115037820-c756cd80-9ec6-11eb-97b0-e617e1b029b7.png)

--------------------------------
### Example Video

https://user-images.githubusercontent.com/52138450/111905871-d07a8900-8a45-11eb-8da7-531793703809.mp4



