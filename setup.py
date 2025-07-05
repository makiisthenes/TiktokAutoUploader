from setuptools import setup, find_packages
import os

# Read the requirements from requirements.txt
with open('requirements.txt', 'r', encoding='utf-8') as f:
    requirements = [line.strip() for line in f if line.strip() and not line.startswith('#')]

# Read the README for long description
with open('README.md', 'r', encoding='utf-8') as f:
    long_description = f.read()

setup(
    name='TikTokAutomation',
    version='2.0.0',
    packages=find_packages(),
    url='https://github.com/makiisthenes/TiktokAutoUploader',
    license='MIT',
    author='Michael',
    author_email='ec20433@qmul.ac.uk',
    description='Tiktok Automatic Uploader - Fastest TikTok AutoUploader using Requests',
    long_description=long_description,
    long_description_content_type='text/markdown',
    install_requires=requirements,
    python_requires='>=3.8',
    classifiers=[
        'Development Status :: 4 - Beta',
        'Intended Audience :: Developers',
        'License :: OSI Approved :: MIT License',
        'Programming Language :: Python :: 3',
        'Programming Language :: Python :: 3.8',
        'Programming Language :: Python :: 3.9',
        'Programming Language :: Python :: 3.10',
        'Programming Language :: Python :: 3.11',
        'Programming Language :: Python :: 3.12',
        'Programming Language :: Python :: 3.13',
        'Topic :: Internet :: WWW/HTTP :: Dynamic Content',
        'Topic :: Software Development :: Libraries :: Python Modules',
    ],
    keywords='tiktok automation uploader video social-media',
    entry_points={
        'console_scripts': [
            'tiktok-uploader=cli:main',
        ],
    },
)

