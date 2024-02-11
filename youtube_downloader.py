from bs4 import BeautifulSoup
from requests_html import HTMLSession, AsyncHTMLSession
from pytube import YouTube
import uuid

YOUTUBE_BASE_URL = "https://www.youtube.com"
VIDEO_BANK_URL = "https://www.youtube.com/source/NPdgPZ0u3zQ/shorts?bp=8gUeChwSGgoLTlBkZ1BaMHUzelESC05QZGdQWjB1M3pR"  # OVER 1 MILLION YT SHORTS.

# Get captions and anchor url tags of each video, to then be downloaded, the first 10k videos will be downloaded. As well as thier caption, in a seperate txt file.
sess = HTMLSession()
asess = AsyncHTMLSession()

sess.headers = {
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3'
}
r = sess.get(VIDEO_BANK_URL)
r.html.render(retries=5, sleep=2)
soup = BeautifulSoup(r.html.html, 'html.parser')

# a.ShortsLockupViewModelHostEndpoint  obtain href
# h3.ShortsLockupViewModelHostMetadataTitle  get aria-label and take all title.


# Extract href from a.ShortsLockupViewModelHostEndpoint
endpoint_tags = soup.find_all('a', class_='ShortsLockupViewModelHostEndpoint')
href_list = [tag['href'] for tag in endpoint_tags]

with open("output/href_list.txt", "w") as f:
    f.write(f"\n{YOUTUBE_BASE_URL}".join(href_list))


#
# # Extract aria-label from h3.ShortsLockupViewModelHostMetadataTitle to get titles
# title_tags = soup.find_all('h3', class_='ShortsLockupViewModelHostMetadataTitle')
# title_list = [tag.get('aria-label', '') for tag in title_tags]
#
# # print(href_list)
# # print(title_list)
#
# # Download each video using pytube and save the titles in a comments file
# for i, (href, title) in enumerate(zip(href_list[:10000], title_list[:10000]), start=1):  # Assuming you want to download the first 10k videos
#     try:
#         yt = YouTube("https://www.youtube.com" + href)
#         stream = yt.streams.filter(adaptive=True, file_extension="mp4").first()
#
#         # Generate a random UUID
#         random_uuid = str(uuid.uuid4())
#
#         # Download video
#         video_file_path = f"output/{random_uuid}.mp4"
#         print(f"Downloading video {i}: {video_file_path}")
#         stream.download(output_path="output", filename=f"{random_uuid}.mp4")
#         print(f"Downloaded: {video_file_path}")
#
#         # Save title in a comments file
#         comments_file_path = f"output/{random_uuid}_title.txt"
#         with open(comments_file_path, 'w', encoding='utf-8') as comments_file:
#             comments_file.write(title)
#     except Exception as e:
#         print(f"Error downloading video {i}: {str(e)}")