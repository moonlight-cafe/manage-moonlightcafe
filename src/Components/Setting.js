import React, { Component } from 'react'
import { Navbar, Method, API, Config } from "../config/Init.js"

export default class Setting extends Component {
        render() {
                return (
                        <>
                                <Navbar />
                                <div className='common-tbl-box'>
                                        <div className="common-tbl-header">
                                                <h2 className="common-tbl-title">Settings</h2>
                                        </div>
                                </div>
                        </>
                )
        }
}
