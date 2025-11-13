"""
Setup script for Briefing CLI tool.
"""

from setuptools import setup, find_packages
from pathlib import Path

# Read the README file
this_directory = Path(__file__).parent
long_description = (this_directory / "README.md").read_text(encoding='utf-8') if (this_directory / "README.md").exists() else ""

# Read requirements
requirements = []
if (this_directory / "requirements.txt").exists():
    requirements = (this_directory / "requirements.txt").read_text(encoding='utf-8').splitlines()

setup(
    name='briefing-cli',
    version='1.0.0',
    author='Varun Kiragi',
    author_email='varunkiragi@icloud.com',
    description='A CLI tool for fetching news and sports summaries',
    long_description=long_description,
    long_description_content_type='text/markdown',
    url='https://github.com/vkiragi/briefing',
    packages=find_packages(),
    install_requires=requirements,
    entry_points={
        'console_scripts': [
            'briefing=briefing.cli:main',
        ],
    },
    classifiers=[
        'Development Status :: 4 - Beta',
        'Intended Audience :: End Users/Desktop',
        'Topic :: Utilities',
        'License :: OSI Approved :: MIT License',
        'Programming Language :: Python :: 3',
        'Programming Language :: Python :: 3.8',
        'Programming Language :: Python :: 3.9',
        'Programming Language :: Python :: 3.10',
        'Programming Language :: Python :: 3.11',
        'Programming Language :: Python :: 3.12',
    ],
    python_requires='>=3.8',
    keywords='cli news sports rss espn terminal',
    project_urls={
        'Bug Reports': 'https://github.com/vkiragi/briefing/issues',
        'Source': 'https://github.com/vkiragi/briefing',
    },
)
